// Extrae del prototipo (city-data.js) la geografía real de Ciudad: centros de barrio (ZONES) y pueblos cercanos (TOWNS)
// de Hazleton. Configuración del producto → packages/db/seeds/zonas.sql (repetible; va también a producción).
// Las cifras de lista de espera del prototipo (wait, ready, goal) son de ejemplo: NO se copian; se cuentan de verdad.
// Uso: node scripts/catalogo/extraer-ciudad.cjs docs/diseno/pantallas/datos/city-data.js packages/db/seeds/zonas.sql
const vm = require("node:vm"), fs = require("node:fs");
const [src, salida] = process.argv.slice(2);
const code = fs.readFileSync(src, "utf8");
const grab = (name) => { const i = code.indexOf(`const ${name} =`); let d = 0, j = code.indexOf("=", i) + 1;
  for (let k = j; k < code.length; k++) { const c = code[k]; if ("[{(".includes(c)) d++; else if ("]})".includes(c)) d--; else if (c === ";" && d === 0) return code.slice(j, k); } };
const ctx = vm.createContext({});
vm.runInContext(`var C0 = ${grab("C0")};`, ctx);
const ZONES = vm.runInContext(`(${grab("ZONES")})`, ctx), TOWNS = vm.runInContext(`(${grab("TOWNS")})`, ctx);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- GENERADO por scripts/catalogo/extraer-ciudad.cjs desde city-data.js del prototipo. No editar a mano.
begin;
`;
ZONES.forEach((z, i) => {
  sql += `insert into zones (id, city_id, name, streets, center, sort) values (${q("hzl-" + z.k)}, 'hzl', ${q(JSON.stringify({ es: z.n[0], en: z.n[1] }))}::jsonb, ${q(JSON.stringify({ es: z.s[0], en: z.s[1] }))}::jsonb, st_geogfromtext('POINT(${z.ll[1]} ${z.ll[0]})'), ${i})
on conflict (id) do update set name = excluded.name, streets = excluded.streets, center = excluded.center, sort = excluded.sort;\n`;
});
sql += `update cities set towns = ${q(JSON.stringify(TOWNS.map(([n, ll]) => ({ n, lat: ll[0], lng: ll[1] }))))}::jsonb where id = 'hzl';\n`;
sql += "commit;\n";
fs.writeFileSync(salida, sql);
console.log(`zonas: ${ZONES.length} · pueblos: ${TOWNS.length}`);
