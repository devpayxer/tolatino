// Extrae del prototipo (city-data.js) la geografía real de Ciudad: centros de barrio (ZONES) y pueblos cercanos (TOWNS)
// de Hazleton. Configuración del producto → packages/db/seeds/zonas.sql (repetible; va también a producción).
// Las cifras de lista de espera del prototipo (wait, ready, goal) son de ejemplo: NO se copian; se cuentan de verdad.
// 9i · Suma los barrios y pueblos de Allentown, Wilkes-Barre, Scranton y Reading (scripts/catalogo/barrios-ciudades.json; el prototipo solo traía
// Hazleton, LAUNCH L64). Un barrio que el equipo cambió o retiró en Super Admin › Ciudades (zones.edited_at) ya no lo pisa la semilla.
// Uso: node scripts/catalogo/extraer-ciudad.cjs docs/diseno/pantallas/datos/city-data.js packages/db/seeds/zonas.sql
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const [src, salida] = process.argv.slice(2);
const code = fs.readFileSync(src, "utf8");
const grab = (name) => { const i = code.indexOf(`const ${name} =`); let d = 0, j = code.indexOf("=", i) + 1;
  for (let k = j; k < code.length; k++) { const c = code[k]; if ("[{(".includes(c)) d++; else if ("]})".includes(c)) d--; else if (c === ";" && d === 0) return code.slice(j, k); } };
const ctx = vm.createContext({});
vm.runInContext(`var C0 = ${grab("C0")};`, ctx);
const ZONES = vm.runInContext(`(${grab("ZONES")})`, ctx), TOWNS = vm.runInContext(`(${grab("TOWNS")})`, ctx);
const OTRAS = JSON.parse(fs.readFileSync(path.join(__dirname, "barrios-ciudades.json"), "utf8")).ciudades;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const CONFLICTO = "on conflict (id) do update set name = excluded.name, streets = excluded.streets, center = excluded.center, sort = excluded.sort where zones.edited_at is null;\n";
const zona = (ciudad, k, n, s, ll, i) => `insert into zones (id, city_id, name, streets, center, sort) values (${q(`${ciudad}-${k}`)}, ${q(ciudad)}, ${q(JSON.stringify(n))}::jsonb, ${q(JSON.stringify(s))}::jsonb, st_geogfromtext('POINT(${ll[1]} ${ll[0]})'), ${i})\n` + CONFLICTO;
let sql = `-- GENERADO por scripts/catalogo/extraer-ciudad.cjs desde city-data.js del prototipo (Hazleton) y scripts/catalogo/barrios-ciudades.json (las otras cuatro). No editar a mano.
begin;
`;
let nz = 0, nt = 0;
ZONES.forEach((z, i) => { sql += zona("hzl", z.k, { es: z.n[0], en: z.n[1] }, { es: z.s[0], en: z.s[1] }, z.ll, i); nz++; });
sql += `update cities set towns = ${q(JSON.stringify(TOWNS.map(([n, ll]) => ({ n, lat: ll[0], lng: ll[1] }))))}::jsonb where id = 'hzl';\n`;
nt += TOWNS.length;
for (const [ciudad, c] of Object.entries(OTRAS)) {
  c.barrios.forEach((z, i) => { sql += zona(ciudad, z.k, { es: z.es, en: z.en }, { es: z.calleEs, en: z.calleEn }, z.ll, i); nz++; });
  sql += `update cities set towns = ${q(JSON.stringify(c.pueblos.map(([n, lat, lng]) => ({ n, lat, lng }))))}::jsonb where id = ${q(ciudad)};\n`;
  nt += c.pueblos.length;
}
sql += "commit;\n";
fs.writeFileSync(salida, sql);
console.log(`zonas: ${nz} · pueblos: ${nt} · ciudades: ${1 + Object.keys(OTRAS).length}`);
