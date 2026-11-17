/* Ronda 2 · Venta de Autos (agente k11): las 34 subcategorías que no hizo la ronda 1 (06–39), 10 negocios en cada una, 2 por ciudad.
   fam = familia de lo que vende (modelos, notas, preguntas); kind = tipo de la app (lib/autos-comun.ts KS_AUTOS) por la subcategoría. */
import { Rng, ORDEN_CIUDADES, CIUDADES } from "../c/base.mjs";

export const CAT = "NEG-DEALER";
export const RUBRO = "dealer";
export const TAG = "k11";

/* s = nombre corto del giro (dos variantes). otras = subcategorías con el mismo tipo que también cubre el negocio. */
const D = [
  ["06", "Financiamiento con ITIN", "ITIN financing", "fin6", "fin", ["Financiamiento ITIN", "Autos con ITIN"], ["07", "33"]],
  ["07", "Financiamiento para primer comprador", "First-time buyer financing", "fin7", "fin", ["Primer Carro", "Mi Primer Auto"], ["06", "33"]],
  ["08", "Certificados usados", "Certified pre-owned", "cert", "new", ["Autos Certificados", "Certified Autos"], ["01", "02"]],
  ["09", "Autos de lujo", "Luxury & exotic", "lux", "lux", ["Luxury Motors", "Autos de Lujo"], ["24", "08"]],
  ["10", "Camionetas y pickups", "Trucks & pickups", "pickup", "lot", ["Camionetas", "Pickups"], ["11", "02"]],
  ["11", "SUVs", "SUVs", "suv", "lot", ["SUV Center", "Camionetas SUV"], ["10", "12"]],
  ["12", "Vans y minivans", "Vans & minivans", "van", "lot", ["Vans y Minivans", "Minivan Center"], ["11", "10"]],
  ["13", "Vehículos de trabajo", "Work & commercial vehicles", "trabajo", "work", ["Vehículos de Trabajo", "Work Vans"], ["14", "15"]],
  ["14", "Venta a flotas", "Fleet sales", "flota", "work", ["Flotas", "Fleet Sales"], ["13", "15"]],
  ["15", "Camiones de caja", "Box trucks", "caja", "work", ["Camiones de Caja", "Box Trucks"], ["13", "14"]],
  ["16", "Tráileres", "Semi trucks", "semi", "work", ["Tráileres", "Truck Sales"], ["15", "17"]],
  ["17", "Remolques", "Trailers", "remolque", "work", ["Remolques", "Trailers"], ["16", "13"]],
  ["18", "Motocicletas", "Motorcycles", "moto", "moto", ["Motos", "Moto Center"], ["19", "20"]],
  ["19", "Cuatrimotos", "ATV & UTV", "atv", "moto", ["Cuatrimotos", "ATV Center"], ["18", "20"]],
  ["20", "Scooters", "Scooters & mopeds", "scooter", "moto", ["Scooters", "Scooter Shop"], ["18", "19"]],
  ["21", "Botes y motos acuáticas", "Boats & jet skis", "bote", "rv", ["Botes", "Marine"], ["22", "23"]],
  ["22", "Casas rodantes", "RV & campers", "rv", "rv", ["Casas Rodantes", "RV Center"], ["21", "23"]],
  ["23", "Carritos de golf", "Golf carts", "golf", "rv", ["Carritos de Golf", "Golf Carts"], ["21", "22"]],
  ["24", "Clásicos y proyectos", "Classic & project cars", "clasico", "lux", ["Clásicos", "Classic Cars"], ["09"]],
  ["25", "Título salvage y reconstruido", "Salvage & rebuilt title", "salv", "salv", ["Autos Reconstruidos", "Salvage Autos"], []],
  ["26", "Subasta de autos", "Auto auction", "sub26", "mayor", ["Subasta de Autos", "Auto Auction"], ["27"]],
  ["27", "Distribuidor mayorista", "Wholesale dealer", "may27", "mayor", ["Autos al Mayoreo", "Wholesale Autos"], ["26"]],
  ["28", "Broker y buscador de autos", "Car broker & finder", "broker", "broker", ["Buscador de Autos", "Auto Broker"], ["29", "32"]],
  ["29", "Venta en consignación", "Consignment sales", "consig", "broker", ["Consignación de Autos", "Consignment Autos"], ["28", "32"]],
  ["30", "Cambio y avalúo", "Trade-in & appraisal", "avaluo", "cash", ["Avalúo de Autos", "Trade Appraisal"], ["31"]],
  ["31", "Compra de autos en efectivo", "Cash for cars", "efectivo", "cash", ["Compramos Carros", "Cash for Cars"], ["30"]],
  ["32", "Venta por dueño", "Private seller listings", "dueno", "broker", ["Vende Tu Carro", "Venta por Dueño"], ["28", "29"]],
  ["33", "Financiamiento del dealer", "Dealer financing", "fin33", "fin", ["Financiamiento de Autos", "Auto Finance"], ["06", "07"]],
  ["34", "Garantía extendida", "Extended warranty", "garantia", "fin", ["Garantía Extendida", "Auto Protect"], ["35", "33"]],
  ["35", "Seguro y GAP", "GAP & dealer insurance", "gap", "fin", ["GAP y Seguro", "Auto Cobertura"], ["34", "33"]],
  ["36", "Placas, título y registro", "Tag, title & registration", "placas", "placas", ["Placas y Títulos", "Tag & Title"], []],
  ["37", "Taller del dealer", "Dealer service department", "taller", "taller", ["Taller y Servicio", "Service Center"], []],
  ["38", "Prueba y entrega a domicilio", "Home test drive & delivery", "casa", "lot", ["Autos a Domicilio", "Entrega en Casa"], ["10", "11"]],
  ["39", "Exportación y envío de vehículos", "Export & vehicle shipping", "envio", "envio", ["Envío de Vehículos", "Export Autos"], []],
];
export const SUBS = D.map(([n, es, en, fam, kind, s, otras]) => ({ id: `NEG-DEALER-${n}`, es, en, fam, kind, s, otras: otras.map((x) => `NEG-DEALER-${x}`), negocios: [] }));

/* Nombres de ficción: 10 por subcategoría, únicos; los cinco primeros llevan la ciudad (1 por ciudad), los otros cinco un apodo. */
const MODS = ["El Cibao", "La Estrella", "Don Pedro", "Los Compadres", "Del Valle", "Keystone", "La Montaña", "El Dorado", "Santa María", "Cerro Alto", "Hermanos Rosario", "Los Primos", "El Sol", "Borinquen", "Quisqueya", "La Fortuna", "Don Chino", "El Jefe", "Mi Pueblo", "La Nueva Era", "Los Tres Reyes", "Alianza", "Premier", "Selecto", "Confianza", "Latino", "Tropical", "Real", "Doña Carmen", "El Patrón", "Pocono", "Susquehanna", "Schuylkill", "Valle Verde", "Centenario", "Frontera", "Los Amigos", "Buena Vista", "La Cumbre", "Tres Palmas", "El Progreso", "San Rafael", "Nuevo Amanecer", "La Ceiba", "Don Julio", "Hermanos Peña", "Lehigh Valley", "Wyoming Valley", "Berks", "Lackawanna", "Hazle", "Monte Verde"];
for (const sub of SUBS) {
  const r = new Rng("r2names:" + sub.id), mods = r.shuffle(MODS), out = [];
  for (let j = 0; j < 10; j++) {
    const c = CIUDADES[ORDEN_CIUDADES[j % 5]].nombre, s = sub.s[j % 2], m = mods[j];
    out.push(j < 5 ? (j % 2 === 0 ? `${s} ${c}` : `${m} ${s} ${c}`) : (j % 2 === 0 ? `${s} ${m}` : `${m} ${s}`));
  }
  sub.negocios = out;
}
