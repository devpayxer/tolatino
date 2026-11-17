/* Ronda 2 · Bienes Raíces: las propiedades (property_listings) de todos los tipos. Mismas reglas que la ronda 1 (c/inmueble.mjs) ampliadas a
   condo, obra nueva, multifamiliar, terreno, rural, casa móvil, lote de casa móvil, cuartos, compartida, amueblado, opción a compra, Section 8, mayores,
   local, oficina, bodega, cocina (por hora), salón (por fecha), bodega de almacenaje y estacionamiento.
   Respeta los CHECK de la tabla y el copy de vivienda justa (c/frases-vivienda.txt + PROT). */
import { q, J, TA, BI, redondea, px, lugar, frenada, PROT } from "../c/base.mjs";
import { cuotaEstimada } from "../c/inmueble.mjs";

export { cuotaEstimada };
export const usd = (c) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const PRECIO = { hzl: [115000, 235000], alw: [175000, 330000], wbr: [85000, 195000], scr: [95000, 235000], rdg: [105000, 225000] };
const ENGANCHES = [3.5, 5, 10, 15, 20];
const PAPELES = [BI("2 recibos de pago o carta del trabajo y una ID de cualquier país.", "2 pay stubs or a work letter and an ID from any country."), BI("Carta del trabajo y una ID de cualquier país.", "A work letter and an ID from any country."), BI("Recibos de pago de los últimos 2 meses y una ID.", "Pay stubs from the last 2 months and an ID.")];
const VIS = [[{ dow: 4, min: 1020 }, { dow: 5, min: 1080 }, { dow: 6, min: 660 }], [{ dow: 2, min: 1080 }, { dow: 4, min: 1080 }, { dow: 6, min: 600 }], [{ dow: 6, min: 600 }, { dow: 6, min: 840 }, { dow: 0, min: 780 }], [{ dow: 1, min: 1020 }, { dow: 3, min: 1020 }, { dow: 6, min: 660 }]];
const N = (es, en) => [es, en];
const NOTAS = {
  venta_casa: [N("Cocina con gabinetes nuevos, piso de madera y patio cercado.", "Kitchen with new cabinets, hardwood floors and a fenced yard."), N("Sótano seco y sin terminar; techo y calentador cambiados hace pocos años.", "Dry unfinished basement; roof and water heater replaced a few years ago."), N("Cerca del centro, del hospital y de las escuelas. Calle tranquila.", "Close to downtown, the hospital and the schools. Quiet street."), N("Baño remodelado, ventanas nuevas y parqueo para dos carros.", "Remodeled bath, new windows and parking for two cars.")],
  condo: [N("Dos niveles, cocina abierta y parqueo asignado.", "Two levels, open kitchen and assigned parking."), N("Edificio con lavandería y áreas comunes cuidadas.", "Building with laundry and well-kept common areas."), N("Cerca del autobús y de las tiendas. Sin patio que mantener.", "Close to the bus and shops. No yard to maintain.")],
  obra: [N("Casa nueva con garantía del constructor, calefacción eficiente y garaje.", "New home with builder warranty, efficient heating and a garage."), N("Cocina con isla, closets amplios y lote con espacio para jardín.", "Kitchen with island, large closets and a lot with room for a garden."), N("Entrega según el calendario por escrito; acabados a escoger.", "Delivery per the written schedule; finishes to choose from.")],
  multi: [N("Cada unidad con su medidor de luz. Rentas actuales y gastos por escrito.", "Each unit with its own power meter. Current rents and expenses in writing."), N("Edificio cerca del centro con parqueo atrás y techo reciente.", "Building near downtown with rear parking and a recent roof."), N("Buena opción para vivir en una unidad y rentar las demás.", "A good option to live in one unit and rent the others.")],
  terreno: [N("Lote plano con calle pavimentada. Agua y drenaje cerca; confirma permisos con la ciudad.", "Flat lot with paved street. Water and sewer nearby; confirm permits with the city."), N("Esquina con buen acceso. Zonificación explicada por escrito.", "Corner lot with good access. Zoning explained in writing."), N("Lote con árboles y vista; medidas y límites en el plano.", "Wooded lot with a view; measurements and boundaries on the plan.")],
  rural: [N("Casa de campo con pozo y septic; caminos de acceso en buen estado.", "Country house with well and septic; access roads in good condition."), N("Acres con terreno abierto y parte de bosque. Se ve con mapa de límites.", "Acres with open ground and some woods. Shown with a boundary map."), N("Propiedad tranquila a pocos minutos del pueblo.", "Quiet property a few minutes from town.")],
  movil: [N("Techo y calentador revisados. Se vende con lote o para mover; el precio dice cuál.", "Roof and water heater checked. Sold with the lot or to be moved; the price says which."), N("Cocina y baños al día, piso nuevo y porche.", "Kitchen and baths up to date, new floor and porch."), N("Anclaje y servicios revisados; la renta del lote, si aplica, está por escrito.", "Anchoring and utilities checked; lot rent, if any, is in writing.")],
  lote_movil: [N("Lote con conexión de agua y luz dentro del parque. Reglas por escrito.", "Lot with water and power hookup inside the park. Rules in writing."), N("Lote plano con espacio para dos carros. Se paga al mes.", "Flat lot with space for two cars. Paid monthly.")],
  apto: [N("Calefacción incluida y lavandería en el edificio.", "Heat included and laundry in the building."), N("Cerca de la parada del autobús y de tiendas.", "Close to the bus stop and shops."), N("Pintura nueva y pisos en buen estado.", "Fresh paint and floors in good condition."), N("Parqueo en la calle y entrada propia.", "Street parking and a private entrance.")],
  casa: [N("Patio atrás y parqueo. Cocina con espacio para comer.", "Back yard and parking. Eat-in kitchen."), N("Sótano para almacenar y lavandería en la casa.", "Basement for storage and laundry in the house."), N("Cerca de escuelas y del autobús. Calle tranquila.", "Close to schools and the bus. Quiet street.")],
  cuarto: [N("Cuarto con llave propia; cocina y baño compartidos con orden de limpieza.", "Room with its own key; kitchen and bath shared with a cleaning rota."), N("Casa tranquila, cerca del autobús. Las reglas se dan por escrito.", "Quiet house near the bus. Rules are given in writing.")],
  compartida: [N("Cuarto en casa compartida: cocina, sala y baño en común, con reglas por escrito.", "Room in a shared house: kitchen, living room and bath in common, with written rules."), N("Utilidades incluidas e internet. Turnos de cocina y limpieza.", "Utilities and internet included. Kitchen and cleaning rota.")],
  amueblado: [N("Muebles, ropa de cama y cocina equipada. Utilidades incluidas.", "Furniture, linens and equipped kitchen. Utilities included."), N("Listo para mudarte con una maleta; internet incluido.", "Move in with one suitcase; internet included.")],
  opcion: [N("Casa en renta con opción a compra. Las condiciones de la opción van por escrito y se leen antes de firmar.", "House for rent with an option to buy. The option terms are in writing and read before you sign."), N("Patio y parqueo. Pregunta cuánto de la renta se acredita; nada está garantizado.", "Yard and parking. Ask how much of the rent is credited; nothing is guaranteed.")],
  s8: [N("Acepta voucher de Section 8. Tú pagas tu parte; la inspección se coordina con la autoridad de vivienda.", "Accepts Section 8 vouchers. You pay your share; the inspection is coordinated with the housing authority."), N("Calefacción y agua incluidas, cerca del autobús.", "Heat and water included, close to the bus.")],
  mayores: [N("Para personas de 62 años o más. Planta baja o elevador, con barras en el baño.", "For people 62 and over. Ground floor or elevator, with bath grab bars."), N("Edificio tranquilo con salón común y lavandería. Cerca de la farmacia.", "Quiet building with common room and laundry. Close to the pharmacy.")],
  local: [N("Local con vidriera a la calle, baño y espacio en el fondo para bodega.", "Storefront with street window, bath and back space for storage."), N("Buena zona de paso; lista para pintar y abrir.", "High-traffic area; ready to paint and open."), N("Electricidad al día y entrada de carga atrás.", "Up-to-date electrical and rear loading door.")],
  oficina: [N("Oficina en segundo piso con recepción compartida, internet y aire acondicionado.", "Second-floor office with shared reception, internet and air conditioning."), N("Espacio con luz natural, baño privado y parqueo para clientes.", "Bright space with private bath and client parking.")],
  bodega: [N("Muelle de carga, techo alto y piso de concreto. Camiones pueden entrar.", "Loading dock, high ceiling and concrete floor. Trucks can enter."), N("Energía trifásica y oficina pequeña adentro.", "Three-phase power and a small office inside.")],
  cocina: [N("Cocina con licencia, campana, estufa de seis hornillas y refrigeración. Reglas de limpieza por escrito.", "Licensed kitchen with hood, six-burner range and refrigeration. Cleaning rules in writing."), N("Se renta por hora, con mínimo de 3 horas. Almacén seco disponible.", "Rented by the hour, 3-hour minimum. Dry storage available.")],
  salon: [N("Salón con mesas y sillas para 120 personas, cocina de apoyo y parqueo.", "Hall with tables and chairs for 120 people, catering kitchen and parking."), N("Incluye 6 horas, montaje y limpieza. Horas extra por escrito.", "Includes 6 hours, setup and cleanup. Extra hours in writing.")],
  almacen: [N("Bodega con puerta enrollable, piso de concreto y acceso con código.", "Unit with roll-up door, concrete floor and keypad access."), N("Cámaras en el pasillo y portón con horario. Acceso todos los días.", "Cameras in the hallway and a gate with hours. Access every day.")],
  parqueo: [N("Espacio con acceso desde la calle y buena iluminación.", "Space with street access and good lighting."), N("Estacionamiento techado, con espacio para camioneta.", "Covered parking with room for a truck.")],
};
const VENTA = new Set(["venta_casa", "condo", "obra", "multi", "terreno", "rural", "movil"]);
const CUOTA = new Set(["venta_casa", "condo", "obra", "multi", "rural", "movil"]);
const COMERCIAL = new Set(["local", "oficina", "bodega"]);

/* ¿Esa clase se puede rentar, vender o ambas? */
export const dealDe = (kind, r, pVenta) => (VENTA.has(kind) ? "venta" : COMERCIAL.has(kind) ? (r.chance(pVenta ?? 0.2) ? "venta" : "renta") : "renta");

export function genProp(B, cfg, r, kind, deal, fotoPick) {
  const ciudad = B.city, [lo, hi] = PRECIO[ciudad];
  const L = lugar(ciudad, r), addr = `${L.num} ${L.calle}`;
  const base = lo + (hi - lo) * r.next();
  const p = { kind, deal, beds: null, baths: null, sqft: null, price: null, rent: null, deposit: 0, appFee: 0, fees: [], pct: null, util: [], laundry: "no", parking: false, pets: false, furnished: false, s8: false, ssn: false, papers: null, lease: null, senior: false, zona: false, hoa: 0, addr, zip: L.zip, lat: L.lat, lng: L.lng };
  let nm, extra = "";
  const aci = (sqft) => (sqft / 43560).toFixed(1).replace(/\.0$/, "");
  if (deal === "venta") {
    const c100 = (x) => redondea(x * 100, 100000);
    if (kind === "venta_casa") { p.beds = r.int(2, 5); p.baths = r.pick([1, 1.5, 2, 2.5, 3]); p.sqft = r.int(900, 2300); p.price = c100(base); nm = [`Casa ${p.beds} cuartos · ${addr}`, `${p.beds} bed home · ${addr}`]; }
    else if (kind === "condo") { p.beds = r.int(1, 3); p.baths = r.pick([1, 1.5, 2, 2.5]); p.sqft = r.int(800, 1700); p.price = c100(base * 0.78); p.hoa = r.int(8, 26) * 10; nm = [`Townhouse ${p.beds} cuartos · ${addr}`, `${p.beds} bed townhouse · ${addr}`]; extra = [` Cuota de HOA: ${usd(p.hoa * 100)} al mes.`, ` HOA fee: ${usd(p.hoa * 100)} a month.`]; }
    else if (kind === "obra") { p.beds = r.int(3, 4); p.baths = r.pick([2, 2.5, 3]); p.sqft = r.int(1400, 2400); p.price = c100(base * 1.35); nm = [`Obra nueva ${p.beds} cuartos · ${addr}`, `New build ${p.beds} bed · ${addr}`]; }
    else if (kind === "multi") { const u = r.int(2, 4); p.beds = Math.min(12, u * r.int(2, 3)); p.baths = u + r.pick([0, 0.5, 1]); p.sqft = r.int(2000, 3600); p.price = c100(base * 1.4); const rn = redondea(u * r.int(650, 950) * 100, 2500); nm = [`Multifamiliar ${u} unidades · ${addr}`, `${u}-unit multifamily · ${addr}`]; extra = [` Renta actual de las unidades: ${usd(rn)} al mes en total.`, ` Current rent across the units: ${usd(rn)} a month in total.`]; }
    else if (kind === "terreno") { p.sqft = r.pick([6000, 8000, 10000, 15000, 21780, 43560, 87120, 130680]); p.price = c100(Math.max(12000, base * 0.28)); nm = [`Terreno ${aci(p.sqft)} acres · ${addr}`, `${aci(p.sqft)} acre land · ${addr}`]; }
    else if (kind === "rural") { const ac = r.int(3, 38); p.sqft = Math.min(1900000, ac * 43560); p.beds = r.chance(0.6) ? r.int(2, 4) : null; p.baths = p.beds ? r.pick([1, 1.5, 2]) : null; p.price = c100(base * 1.1 + ac * 2500); nm = [`Propiedad rural ${ac} acres · ${addr}`, `${ac} acre rural property · ${addr}`]; }
    else if (kind === "movil") { p.beds = r.int(2, 3); p.baths = r.pick([1, 2]); p.sqft = r.int(900, 1300); p.price = c100(Math.max(18000, base * 0.32)); nm = [`Casa móvil ${p.beds} cuartos · ${addr}`, `${p.beds} bed mobile home · ${addr}`]; }
    else if (kind === "local") { p.sqft = r.int(500, 3000); p.price = c100(p.sqft * r.int(70, 130)); nm = [`Local comercial ${p.sqft.toLocaleString("en-US")} pies² en venta · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft storefront for sale · ${addr}`]; }
    else if (kind === "oficina") { p.sqft = r.int(500, 3000); p.price = c100(p.sqft * r.int(70, 140)); nm = [`Oficinas ${p.sqft.toLocaleString("en-US")} pies² en venta · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft offices for sale · ${addr}`]; }
    else { p.sqft = r.int(3000, 18000); p.price = c100(p.sqft * r.int(28, 55)); nm = [`Bodega ${p.sqft.toLocaleString("en-US")} pies² en venta · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft warehouse for sale · ${addr}`]; }
    if (p.price < 100000) p.price = 100000;
    p.pct = CUOTA.has(kind) ? r.pick(ENGANCHES) : null;
    p.cuota = p.pct ? cuotaEstimada(p.price, p.pct) : null;
  } else {
    if (kind === "apto") { p.beds = r.int(1, 3); p.baths = 1; p.sqft = r.int(550, 1050); p.rent = redondea((600 + p.beds * 230 + r.int(-60, 120)) * 100, 2500); nm = [`${p.beds === 1 ? "Apartamento 1 cuarto" : `Apartamento ${p.beds} cuartos`} · ${addr}`, `${p.beds} bed apartment · ${addr}`]; }
    else if (kind === "casa") { p.beds = r.int(2, 4); p.baths = r.pick([1, 1.5, 2]); p.sqft = r.int(950, 1600); p.rent = redondea((900 + p.beds * 270 + r.int(-80, 150)) * 100, 2500); nm = [`Casa ${p.beds} cuartos en renta · ${addr}`, `${p.beds} bed house for rent · ${addr}`]; }
    else if (kind === "cuarto") { p.beds = 1; p.baths = 1; p.rent = redondea(r.int(450, 650) * 100, 2500); p.furnished = r.chance(0.6); nm = [p.furnished ? `Cuarto amueblado · ${L.calle}` : `Cuarto con baño compartido · ${L.calle}`, p.furnished ? `Furnished room · ${L.calle}` : `Room with shared bath · ${L.calle}`]; }
    else if (kind === "compartida") { p.beds = 1; p.baths = 1; p.rent = redondea(r.int(400, 620) * 100, 2500); p.furnished = r.chance(0.5); nm = [`Cuarto en casa compartida · ${L.calle}`, `Room in a shared house · ${L.calle}`]; }
    else if (kind === "amueblado") { p.beds = r.int(1, 2); p.baths = 1; p.sqft = r.int(450, 850); p.rent = redondea((1000 + p.beds * 220 + r.int(-80, 160)) * 100, 2500); p.furnished = true; nm = [`Amueblado ${p.beds} ${p.beds === 1 ? "cuarto" : "cuartos"} · ${addr}`, `Furnished ${p.beds} bed · ${addr}`]; }
    else if (kind === "opcion") { p.beds = r.int(2, 4); p.baths = r.pick([1, 1.5, 2]); p.sqft = r.int(950, 1700); p.rent = redondea((1000 + p.beds * 240 + r.int(-60, 160)) * 100, 2500); nm = [`Casa ${p.beds} cuartos con opción a compra · ${addr}`, `${p.beds} bed rent-to-own house · ${addr}`]; }
    else if (kind === "s8") { p.beds = r.int(1, 3); p.baths = 1; p.sqft = r.chance(0.5) ? r.int(550, 1000) : null; p.rent = redondea((650 + p.beds * 200 + r.int(-40, 100)) * 100, 2500); p.s8 = true; nm = [`${p.beds} ${p.beds === 1 ? "cuarto" : "cuartos"} · Section 8 · ${addr}`, `${p.beds} bed · Section 8 · ${addr}`]; }
    else if (kind === "mayores") { p.beds = r.int(0, 2); p.baths = 1; p.sqft = r.int(450, 800); p.rent = redondea((560 + p.beds * 180 + r.int(-30, 90)) * 100, 2500); p.senior = true; nm = [`${p.beds === 0 ? "Estudio" : `Apartamento ${p.beds} ${p.beds === 1 ? "cuarto" : "cuartos"}`} · mayores de 62 · ${addr}`, `${p.beds === 0 ? "Studio" : `${p.beds} bed apartment`} · 62 and over · ${addr}`]; }
    else if (kind === "lote_movil") { p.rent = redondea(r.int(350, 620) * 100, 2500); nm = [`Lote para casa móvil · ${addr}`, `Mobile home lot · ${addr}`]; }
    else if (kind === "local") { p.sqft = r.int(500, 3000); p.rent = redondea(((p.sqft * r.int(9, 16)) / 12) * 100, 2500); nm = [`Local comercial ${p.sqft.toLocaleString("en-US")} pies² · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft storefront · ${addr}`]; }
    else if (kind === "oficina") { p.sqft = r.int(250, 2000); p.rent = redondea(((p.sqft * r.int(10, 17)) / 12) * 100, 2500); nm = [`Oficina ${p.sqft.toLocaleString("en-US")} pies² · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft office · ${addr}`]; }
    else if (kind === "bodega") { p.sqft = r.int(3000, 18000); p.rent = redondea(((p.sqft * r.int(4, 8)) / 12) * 100, 2500); nm = [`Bodega ${p.sqft.toLocaleString("en-US")} pies² · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft warehouse · ${addr}`]; }
    else if (kind === "cocina") { p.sqft = r.int(300, 1200); p.rent = redondea(r.int(1800, 3500), 100); nm = [`Cocina comercial ${p.sqft.toLocaleString("en-US")} pies² · ${addr}`, `${p.sqft.toLocaleString("en-US")} sq ft commercial kitchen · ${addr}`]; }
    else if (kind === "salon") { p.sqft = r.int(1200, 5000); p.rent = redondea(r.int(60000, 180000), 5000); nm = [`Salón de eventos ${r.pick([80, 100, 120, 150, 200])} personas · ${addr}`, `Event hall for ${r.pick([80, 100, 120, 150, 200])} guests · ${addr}`]; const cap = r.pick([80, 100, 120, 150, 200]); nm = [`Salón de eventos ${cap} personas · ${addr}`, `Event hall for ${cap} guests · ${addr}`]; }
    else if (kind === "almacen") { p.sqft = r.pick([25, 50, 75, 100, 150, 200, 300]); p.rent = redondea(p.sqft * r.int(120, 220), 500); const dim = { 25: "5 × 5", 50: "5 × 10", 75: "5 × 15", 100: "10 × 10", 150: "10 × 15", 200: "10 × 20", 300: "10 × 30" }[p.sqft]; nm = [`Bodega ${dim} · ${addr}`, `${dim} storage unit · ${addr}`]; }
    else { p.rent = redondea(r.int(35, 120) * 100, 500); const cub = r.chance(0.4); nm = [cub ? `Estacionamiento techado · ${addr}` : `Estacionamiento · ${addr}`, cub ? `Covered parking · ${addr}` : `Parking · ${addr}`]; }
    // Lo que se paga para mudarte
    const vivienda = ["apto", "casa", "cuarto", "compartida", "amueblado", "opcion", "s8", "mayores", "lote_movil"].includes(kind);
    const com = COMERCIAL.has(kind), per = kind === "cocina" || kind === "salon";
    p.deposit = per ? (kind === "cocina" ? r.pick([0, p.rent, p.rent * 2]) : r.pick([Math.round(p.rent / 2 / 100) * 100, p.rent])) : kind === "s8" ? Math.min(p.rent, redondea(r.int(300, 700) * 100, 5000)) : kind === "almacen" || kind === "parqueo" ? r.pick([0, p.rent]) : r.pick([p.rent, p.rent, Math.round(p.rent / 2 / 100) * 100, Math.min(p.rent * 2, p.rent + 20000)]);
    p.deposit = Math.min(p.deposit, p.rent * 2);
    p.appFee = vivienda && kind !== "cuarto" && kind !== "compartida" ? r.pick([0, 0, 2500, 3500]) : 0;
    if (vivienda && r.chance(0.2)) p.fees = [{ label: BI("Último mes", "Last month"), cents: p.rent }];
    if (com && r.chance(0.3)) p.fees = [{ label: BI("Último mes", "Last month"), cents: p.rent }];
    p.moveIn = per ? null : p.rent + p.deposit + p.appFee + p.fees.reduce((s, f) => s + f.cents, 0);
    if (kind === "apto" || kind === "casa") { p.util = r.some(["agua", "basura", "calefaccion", "luz", "internet"], r.int(0, 3)); p.laundry = kind === "casa" ? "unidad" : r.pick(["no", "edificio", "edificio"]); p.parking = r.chance(0.7); p.pets = r.chance(0.35); p.s8 = r.chance(0.4); p.ssn = r.chance(0.12); }
    if (kind === "cuarto") { p.util = r.some(["agua", "basura", "calefaccion", "luz", "internet"], r.int(1, 4)); p.zona = true; p.pets = false; }
    if (kind === "compartida") { p.util = r.some(["agua", "basura", "calefaccion", "luz", "internet"], r.int(3, 5)); p.zona = true; p.laundry = "unidad"; }
    if (kind === "amueblado") { p.util = ["luz", "agua", "internet", "calefaccion"]; p.laundry = r.pick(["unidad", "edificio"]); p.pets = r.chance(0.2); }
    if (kind === "opcion") { p.util = []; p.laundry = "unidad"; p.parking = true; p.pets = r.chance(0.3); }
    if (kind === "s8") { p.util = r.some(["agua", "basura", "calefaccion"], r.int(1, 3)); p.laundry = r.pick(["no", "edificio"]); p.pets = r.chance(0.3); }
    if (kind === "mayores") { p.util = r.some(["agua", "basura", "calefaccion"], r.int(1, 3)); p.laundry = "edificio"; p.pets = r.chance(0.3); }
    if (kind === "lote_movil") { p.util = ["agua", "basura"]; p.parking = true; p.pets = r.chance(0.5); }
    if (kind === "oficina") p.util = r.some(["agua", "basura", "calefaccion", "internet"], r.int(1, 4));
    if (kind === "cocina") p.util = ["luz", "agua", "gas"];
    if (kind === "almacen") p.util = [];
    p.papers = vivienda ? (kind === "s8" ? BI("Tu voucher de Section 8 y una ID.", "Your Section 8 voucher and an ID.") : kind === "mayores" ? BI("Comprobante de edad (62 o más) y una ID.", "Proof of age (62 or over) and an ID.") : kind === "lote_movil" ? BI("Título de tu casa móvil y una ID.", "Title to your mobile home and an ID.") : r.pick(PAPELES)) : null;
    p.lease = vivienda ? (kind === "cuarto" || kind === "compartida" ? BI("Mes a mes", "Month to month") : kind === "amueblado" ? BI("Desde 1 mes", "From 1 month") : kind === "opcion" ? BI("12 meses con opción a compra", "12 months with option to buy") : kind === "lote_movil" ? BI("Mes a mes", "Month to month") : r.pick([BI("12 meses", "12 months"), BI("12 meses", "12 months"), BI("6 o 12 meses", "6 or 12 months")]))
      : com ? BI("Desde 1 año", "From 1 year") : kind === "almacen" || kind === "parqueo" ? BI("Mes a mes", "Month to month") : null;
  }
  const nota = r.pick(NOTAS[kind] ?? NOTAS.casa);
  let desc;
  if (deal === "venta") {
    const ex = extra ? [extra[0], extra[1]] : ["", ""];
    desc = [`${usd(p.price)}. ${nota[0]}${ex[0]}${p.cuota ? ` Cuota estimada con ${String(p.pct).replace(/\.0$/, "")} % de enganche: ${usd(p.cuota)} al mes con impuestos y seguro.` : ""}`, `${usd(p.price)}. ${nota[1]}${ex[1]}${p.cuota ? ` Estimated payment with ${p.pct}% down: ${usd(p.cuota)} a month with taxes and insurance.` : ""}`];
  } else if (kind === "cocina") desc = [`${usd(p.rent)} por hora. ${nota[0]}${p.deposit ? ` Depósito ${usd(p.deposit)}.` : " Sin depósito."}`, `${usd(p.rent)} per hour. ${nota[1]}${p.deposit ? ` ${usd(p.deposit)} deposit.` : " No deposit."}`];
  else if (kind === "salon") desc = [`${usd(p.rent)} por fecha. ${nota[0]} Depósito ${usd(p.deposit)}.`, `${usd(p.rent)} per date. ${nota[1]} ${usd(p.deposit)} deposit.`];
  else desc = [`${usd(p.rent)} al mes. ${nota[0]} Para mudarte: ${usd(p.rent)} + depósito ${usd(p.deposit)}${p.appFee ? ` + solicitud ${usd(p.appFee)}` : ""}${p.fees.length ? ` + último mes ${usd(p.rent)}` : ""} = ${usd(p.moveIn)}.`, `${usd(p.rent)} a month. ${nota[1]} To move in: ${usd(p.rent)} + ${usd(p.deposit)} deposit${p.appFee ? ` + ${usd(p.appFee)} application` : ""}${p.fees.length ? ` + last month ${usd(p.rent)}` : ""} = ${usd(p.moveIn)}.`];
  p.nm = [nm[0].slice(0, 60), nm[1].slice(0, 60)];
  p.desc = desc;
  const bad = frenada(p.nm[0], p.nm[1], desc[0], desc[1], p.papers?.es, p.papers?.en, p.lease?.es, p.lease?.en);
  const prot = kind !== "mayores" && (PROT.test(desc.join(" ")) || PROT.test(p.nm.join(" ")));
  if (bad || prot) throw new Error(`copy no pasa vivienda justa (${kind}): ${bad ?? "PROT"} :: ${desc[0]}`);
  p.foto = fotoPick();
  p.vis = r.pick(VIS); p.cupo = r.pick([1, 1, 2, 3]);
  return p;
}

/* El INSERT de la propiedad (después del item). Mismas columnas que la ronda 1. */
export function itemProp(p, i, estado, statusD) {
  const attrs = { visit_pattern: p.vis.map((v) => ({ ...v, on: true })), cupo: p.cupo };
  const vals = ["it", "b", "x.city_id", q(p.kind), p.beds ?? "null", p.baths ?? "null", p.sqft ?? "null", p.rent ?? "null", p.price ?? "null", p.deposit, p.appFee, J(p.fees), p.moveIn ?? "null", p.cuota ?? "null", p.pct ?? "null",
    p.rent != null && estado === "available" ? "(now() at time zone 'America/New_York')::date" : "null", p.furnished, p.pets, TA(p.util), p.parking, q(p.laundry), p.s8, p.ssn, p.papers ? J(p.papers) : "null", p.lease ? J(p.lease) : "null",
    p.senior ? "true" : "false", q(p.senior ? "ok" : "none"), q(p.addr), q(p.zip), `st_setsrid(st_point(${p.lng}, ${p.lat}), 4326)::geography`, p.zona ? "false" : "true", q(estado), statusD == null ? "now()" : `pg_temp.c_ts(${statusD}, 800)`];
  return {
    m: "svc", es: p.nm[0], en: p.nm[1], des: p.desc[0], den: p.desc[1], price: p.rent ?? p.price, dur: 30, kind: p.deal, attrs, fotos: [px(p.foto)], sort: i, ret: true,
    after: `insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, app_fee_cents, fees, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status, status_at)
  select ${vals.join(", ")} from businesses x where x.id = b;`,
  };
}
