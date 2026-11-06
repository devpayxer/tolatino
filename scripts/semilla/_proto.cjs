const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const dir = "docs/diseno/pantallas/datos";
const src = fs.readFileSync("scripts/catalogo/extraer-paginas.cjs", "utf8");
const win = eval(src.slice(src.indexOf("const store = {}"), src.indexOf("const ctx = vm.createContext(win);")) + "; win");
const ctx = vm.createContext(win);
for (const f of fs.readFileSync(path.join(dir, "orden.txt"), "utf8").split("\n").filter(Boolean)) { try { vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f, timeout: 5000 }); } catch (e) { console.error("ERR", f, e.message); } }
module.exports = win;
