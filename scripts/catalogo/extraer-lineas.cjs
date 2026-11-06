// Saca del prototipo la «línea fija» de cada categoría (window.TL*.line, la que nunca se suaviza) y el tipo de
// transacción (adm-data.js CATS[].tx) → packages/db/seeds/lineas.sql (semilla repetible: solo escribe esas dos columnas).
// Uso (desde el repo): node scripts/catalogo/extraer-lineas.cjs > packages/db/seeds/lineas.sql
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const dir = "docs/diseno/pantallas/datos";
const src = fs.readFileSync("scripts/catalogo/extraer-paginas.cjs", "utf8");
// Mismo entorno de navegador falso que extraer-paginas.cjs.
const win = eval(src.slice(src.indexOf("const store = {}"), src.indexOf("const ctx = vm.createContext(win);")) + "; win");
const ctx = vm.createContext(win);
for (const f of fs.readFileSync(path.join(dir, "orden.txt"), "utf8").split("\n").filter(Boolean)) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f, timeout: 5000 });
const A = win.TLAdm;
if (!A || !A.CATS) throw new Error("no está TLAdm.CATS");
const OBJ = { "NEG-TIENDA": "TLTienda" };
const TX = { ped: "order", cita: "booking", bol: "ticket", none: "none" };
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = ["-- Generado por scripts/catalogo/extraer-lineas.cjs desde el prototipo. No editar a mano.", "begin;"];
for (const c of A.CATS) {
  const D = win[OBJ[c.k] || c.g] || {};
  const line = Array.isArray(D.line) && typeof D.line[0] === "string" ? `${q(JSON.stringify({ es: D.line[0], en: D.line[1] || D.line[0] }))}::jsonb` : "null";
  if (!TX[c.tx]) throw new Error(`tx desconocido ${c.k}: ${c.tx}`);
  out.push(`update categories set fixed_line = ${line}, op_kind = ${q(TX[c.tx])} where id = ${q(c.k)};`);
}
out.push("commit;");
console.log(out.join("\n"));
