#!/usr/bin/env node
/* 9m · Direcciones a escala NACIONAL (decisión AC; guardián autocompletarRapido): ~6 M de nombres de calle (una fila por calle y código postal en
   ~33 mil códigos postales de los 50 estados, con los nombres que más se repiten en EE. UU.: Main St, Oak St, 2nd Ave…), 2 M de tramos y 2 M de
   puntos, y mide el código REAL de la app (lib/direcciones.ts: sugerir e inversa) contra el presupuesto de ≤ 100 ms. Los datos son inventados
   (la forma y el volumen de los de verdad); los de verdad se cargan con infra/direcciones/generar.sh en el servidor.
   Uso: DATABASE_URL=postgres://…@127.0.0.1/… node scripts/carga/direcciones-1m.mjs [--sin-generar]   (CARGA_ESCALA=0.05 para probar el guion) */
import { analizar, app, candado, fin, generar, medir, n, uno } from "./lib/comun.mjs";

await candado();
const NOMBRES = n(6_000_000), ZIPS = 33_000, POR_ZIP = Math.max(1, Math.round(NOMBRES / ZIPS)), TRAMOS = n(2_000_000), PUNTOS = n(2_000_000);
// Los 50 estados + DC con su recuadro aproximado (lat0, lat1, lng0, lng1): los códigos postales se reparten adentro.
const EST = [["AL",30.2,35,-88.5,-85],["AK",55,64,-160,-140],["AZ",31.3,37,-114.8,-109],["AR",33,36.5,-94.6,-89.6],["CA",32.5,42,-124.4,-114.1],["CO",37,41,-109,-102],
  ["CT",41,42,-73.7,-71.8],["DE",38.5,39.8,-75.8,-75],["DC",38.8,39,-77.1,-76.9],["FL",25,31,-87.6,-80],["GA",30.4,35,-85.6,-80.8],["HI",19,22.2,-160,-154.8],
  ["ID",42,49,-117.2,-111],["IL",37,42.5,-91.5,-87.5],["IN",37.8,41.8,-88.1,-84.8],["IA",40.4,43.5,-96.6,-90.1],["KS",37,40,-102,-94.6],["KY",36.5,39.1,-89.6,-82],
  ["LA",29,33,-94,-89],["ME",43,47.4,-71.1,-67],["MD",37.9,39.7,-79.5,-75],["MA",41.2,42.9,-73.5,-69.9],["MI",41.7,48.3,-90.4,-82.4],["MN",43.5,49.4,-97.2,-89.5],
  ["MS",30.2,35,-91.7,-88.1],["MO",36,40.6,-95.8,-89.1],["MT",44.4,49,-116,-104],["NE",40,43,-104,-95.3],["NV",35,42,-120,-114],["NH",42.7,45.3,-72.6,-70.6],
  ["NJ",38.9,41.4,-75.6,-73.9],["NM",31.3,37,-109,-103],["NY",40.5,45,-79.8,-71.8],["NC",33.8,36.6,-84.3,-75.5],["ND",45.9,49,-104,-96.6],["OH",38.4,42,-84.8,-80.5],
  ["OK",33.6,37,-103,-94.4],["OR",42,46.3,-124.6,-116.5],["PA",39.7,42,-80.5,-74.7],["RI",41.1,42,-71.9,-71.1],["SC",32,35.2,-83.4,-78.5],["SD",42.5,45.9,-104,-96.4],
  ["TN",35,36.7,-90.3,-81.6],["TX",25.8,36.5,-106.6,-93.5],["UT",37,42,-114,-109],["VT",42.7,45,-73.4,-71.5],["VA",36.5,39.5,-83.7,-75.2],["WA",45.5,49,-124.8,-116.9],
  ["WV",37.2,40.6,-82.6,-77.7],["WI",42.5,47,-92.9,-86.8],["WY",41,45,-111,-104]];
// Las calles que más se repiten en EE. UU. (y las de nuestras pruebas), con dirección y tipo: ~20 mil nombres distintos.
const BASE = ["Main","Oak","Pine","Maple","Cedar","Elm","Washington","Lake","Hill","Park","Walnut","Spring","North","Ridge","Lincoln","Church","Willow","Mill","Sunset",
  "Railroad","Jackson","Cherry","Franklin","Highland","Center","Johnson","Jefferson","Adams","Madison","Chestnut","Broad","Wyoming","Congress","Market","Union","Locust",
  "Spruce","Hickory","Dogwood","Laurel","Poplar","Sycamore","Birch","Holly","Magnolia","Meadow","Forest","River","Valley","View","Grove","Prospect","Liberty","Water",
  "High","School","College","Academy","Bridge","Front","Green","King","Queen","Prince","Market","Front","Ash","Beech","Hemlock","Juniper","Mulberry","Orchard","Vine",
  ...Array.from({ length: 120 }, (_, i) => `${i + 1}${i % 10 === 0 && i !== 10 ? "st" : i % 10 === 1 && i !== 11 ? "nd" : i % 10 === 2 && i !== 12 ? "rd" : "th"}`)];
const TIPO = ["St","Ave","Rd","Dr","Ln","Ct","Pl","Blvd","Way","Ter"], DIR = ["","N ","S ","E ","W "];

if (!process.argv.includes("--sin-generar")) {
  await generar("limpiar la carga anterior", [`delete from geo_names where source = 'carga-1m'`, `delete from geo_streets where source = 'carga-1m'`, `delete from geo_points where source = 'carga-1m'`, `delete from geo_zips where zip like '9_%' and place = 'Carga'`]);
  await generar("códigos postales", [
    `drop table if exists carga_z`,
    `create unlogged table carga_z as
       select z, e.s as state, e.la0 + (e.la1 - e.la0) * ((hashtext('a' || z) & 2147483647) / 2147483647.0) as lat, e.lo0 + (e.lo1 - e.lo0) * ((hashtext('b' || z) & 2147483647) / 2147483647.0) as lng
         from generate_series(0, ${ZIPS - 1}) z
         join (select row_number() over () - 1 as k, x.s, x.la0, x.la1, x.lo0, x.lo1 from jsonb_to_recordset('${JSON.stringify(EST.map(([s, la0, la1, lo0, lo1]) => ({ s, la0, la1, lo0, lo1 })))}'::jsonb) x(s text, la0 float8, la1 float8, lo0 float8, lo1 float8)) e
           on e.k = z % ${EST.length}`,
    // Hazleton de verdad (el punto desde donde se mide) como uno más.
    `insert into carga_z values (${ZIPS}, 'PA', 40.9584, -75.9746)`,
    `create index on carga_z (z)`, `analyze carga_z`]);
  await generar("nombres de calle (lo que se autocompleta)", [
    `insert into geo_names (norm, name, zip, place, state, n, source, geom)
     select dir_abrev(nm), nm, lpad((10000 + z.z)::text, 5, '0'), 'Carga', z.state, 1, 'carga-1m', st_setsrid(st_point(z.lng + (k % 30 - 15) * 0.0007, z.lat + (k / 30 % 30 - 15) * 0.0007), 4326)
       from carga_z z cross join lateral generate_series(0, ${POR_ZIP - 1}) k
       cross join lateral (select ('${JSON.stringify(DIR)}'::jsonb ->> ((hashtext(z.z || 'd' || k) & 2147483647) % ${DIR.length})) ||
                                  ('${JSON.stringify(BASE)}'::jsonb ->> ((hashtext(z.z || 'b' || k) & 2147483647) % ${BASE.length})) || ' ' ||
                                  ('${JSON.stringify(TIPO)}'::jsonb ->> ((hashtext(z.z || 't' || k) & 2147483647) % ${TIPO.length})) as nm) x
     on conflict (norm, zip) do nothing`]);
  await generar("tramos (rango 1–999) de una parte de los nombres", [
    `insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom, state, place, source)
     select g.name, g.norm, 1, 999, 2, 998, g.zip, g.zip, 'carga', st_makeline(g.geom, st_translate(g.geom, 0, 0.004)), g.state, g.place, 'carga-1m'
       from geo_names g where g.source = 'carga-1m' and g.id % ${Math.max(1, Math.round(NOMBRES / TRAMOS))} = 0`]);
  await generar("puntos (casa por casa) de esos tramos", [
    `insert into geo_points (num, num_i, street, norm, state, zip, place, source, geom)
     select (1 + k * 2)::text, 1 + k * 2, s.name, s.norm, s.state, s.zip_l, s.place, 'carga-1m', st_lineinterpolatepoint(s.geom, k / 500.0)
       from (select * from geo_streets where source = 'carga-1m' limit ${Math.max(1, Math.round(PUNTOS / 10))}) s cross join generate_series(0, 9) k`]);
  await generar("códigos postales de la carga", [`insert into geo_zips (zip, state, place, geom) select lpad((10000 + z)::text, 5, '0'), state, 'Carga', st_setsrid(st_point(lng, lat), 4326) from carga_z on conflict (zip) do nothing`, `drop table carga_z`]);
  await analizar();
}
const cifras = await uno(`select (select count(*) from geo_names)::int as nombres, (select count(*) from geo_streets)::int as tramos, (select count(*) from geo_points)::int as puntos`);
console.log(`[carga] nombres ${cifras.nombres.toLocaleString("es-US")} · tramos ${cifras.tramos.toLocaleString("es-US")} · puntos ${cifras.puntos.toLocaleString("es-US")}`);
const { sugerir, inversa } = await app("lib/direcciones.ts");
const HZL = { lat: 40.9584, lng: -75.9746, estado: "PA" };
const ESCRITO = ["123 N Wyo", "45 Oak", "12 W Bro", "1100 Congress", "7 Wash", "350 5th Ave, New York, NY", "88 Pine St Austin TX", "9 Main", "501 Chu", "77 S Maple Ave"];
for (const [i, q] of ESCRITO.entries()) {
  await medir(`dir-sugerir-${i + 1}`, { linea: "AC", presupuesto: 100, veces: 20, que: `autocompletar «${q}» desde Hazleton (${cifras.nombres.toLocaleString("es-US")} nombres)` }, async () => { if (!(await sugerir(q, HZL)).length) throw new Error(`sin sugerencias para «${q}»`); });
}
await medir("dir-sugerir-mezcla", { linea: "AC", presupuesto: 100, veces: 60, que: "autocompletar letra por letra («1», «12», «12 W», «12 W B»…)" }, async (k) => {
  const t = "12 W Broad St"; await sugerir(t.slice(0, 3 + (k % (t.length - 2))), HZL);
});
await medir("dir-inversa", { linea: "AC", presupuesto: 100, veces: 40, que: "«Usar mi ubicación» (GPS → la dirección más cercana)" }, async (k) => { await inversa(40.9584 + (k % 7) * 0.001, -75.9746 + (k % 5) * 0.001); });
process.exit((await fin()) ? 1 : 0);
