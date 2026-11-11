#!/usr/bin/env node
/* 8e · El servidor de la ruta para el humo del emulador (CI): contesta como /api/ruta/posicion y anota lo que recibe. En el emulador es
   http://10.0.2.2:<puerto> (solo un build depurable deja que TLRuta apunte aquí: servidorPrueba). Sin dependencias.
   POST /api/ruta/posicion → { activa, aceptadas, rechazadas, cadaS, minM } (o 410 después de /__fin)
   GET /__estado → { llamadas, posiciones, lotes: [n…], tokens: [huellas cortas], fuente, ultima }
   GET /__fin → desde aquí contesta 410 «activa: false» · GET /__sigue → vuelve a contestar 200 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
const puerto = Number(process.argv[2] || 4510);
let fin = false;
const e = { llamadas: 0, posiciones: 0, lotes: [], tokens: [], fuente: null, ultima: null, sinToken: 0 };
createServer((req, res) => {
  const json = (st, b) => { res.writeHead(st, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
  if (req.method === "GET" && req.url === "/__estado") return json(200, e);
  if (req.method === "GET" && req.url === "/__fin") { fin = true; return json(200, { fin }); }
  if (req.method === "GET" && req.url === "/__sigue") { fin = false; return json(200, { fin }); }
  if (req.method !== "POST" || req.url !== "/api/ruta/posicion") return json(404, {});
  let t = "";
  req.on("data", (c) => { t += c; if (t.length > 16384) req.destroy(); });
  req.on("end", () => {
    e.llamadas++;
    const tok = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || "")?.[1];
    if (!tok) { e.sinToken++; return json(401, { activa: false }); }
    const h = createHash("sha256").update(tok).digest("hex").slice(0, 12);
    if (!e.tokens.includes(h)) e.tokens.push(h);
    if (fin) return json(410, { activa: false });
    let b = {}; try { b = JSON.parse(t); } catch { /* cuerpo roto */ }
    const p = Array.isArray(b.p) ? b.p : [];
    e.posiciones += p.length; e.lotes.push(p.length); e.fuente = b.fuente ?? null; e.ultima = p[p.length - 1] ?? e.ultima;
    json(200, { activa: true, aceptadas: p.length, rechazadas: 0, cadaS: 5, minM: 5 });
  });
}).listen(puerto, "127.0.0.1", () => console.log(`ruta-sim en 127.0.0.1:${puerto}`));
