#!/usr/bin/env node
/* Las fotos de las páginas de categoría (portada, mosaicos de las filas y de «Qué se te antoja») se sirven POR NOSOTROS, no desde otra empresa.
   El prototipo las traía de images.pexels.com (extraer-paginas.cjs las deja así en packages/taxonomy/paginas.json). Este paso las baja UNA vez, las
   convierte a WebP sin metadatos (sharp, el mismo del producto) y reescribe cada dirección a /paginas/<página>.<huella>.webp, un archivo estático de la
   app (apps/web/public/paginas/). Con la huella en el nombre el navegador las guarda un año sin volver a preguntar (next.config.ts).
   Idempotente: lo que ya no es de Pexels se salta; lo que ya está convertido no se vuelve a bajar (packages/taxonomy/fotos-paginas.json guarda de dónde
   salió cada archivo: id de la foto en Pexels, para el crédito si algún día hace falta).
   Tamaños (la caja más grande que las pinta, a doble densidad): portada 1080 de ancho (caja de 540); mosaico: lado corto 200 (caja de 112 × 80).
   Uso: NODE_USE_ENV_PROXY=1 node scripts/catalogo/fotos-paginas.mjs   (NODE_USE_ENV_PROXY solo si la red sale por un proxy)   (después: node scripts/catalogo/generar-paginas-sql.mjs) */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../..", import.meta.url).pathname;
const sharp = createRequire(join(RAIZ, "apps/web/package.json"))("sharp");
const JSON_PAGINAS = join(RAIZ, "packages/taxonomy/paginas.json");
const MAPA = join(RAIZ, "packages/taxonomy/fotos-paginas.json");
const DESTINO = join(RAIZ, "apps/web/public/paginas");
const PEXELS = /^https:\/\/images\.pexels\.com\/photos\/(\d+)\/[^?\s]*$/;
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

const P = JSON.parse(readFileSync(JSON_PAGINAS, "utf8"));
const mapa = existsSync(MAPA) ? JSON.parse(readFileSync(MAPA, "utf8")) : { nota: "", fotos: {} };
mapa.nota = "De dónde salió cada foto de packages/taxonomy/paginas.json: la llave es el id de la foto en Pexels (su página es /photo/<id>/ en pexels.com), el rol que decide su tamaño y el archivo propio que la sirve (apps/web/public/paginas). Lo escribe scripts/catalogo/fotos-paginas.mjs; no se edita a mano.";
mapa.fotos ??= {};

// 1 · Qué fotos hay y con qué rol (la portada pide más ancho que un mosaico; si una foto hace las dos cosas, se queda con la portada).
const usos = new Map(); // id → { url, rol, nombre }
const ver = (url, rol, nombre) => {
  const m = typeof url === "string" ? PEXELS.exec(url) : null;
  if (!m) return;
  const u = usos.get(m[1]);
  if (!u) usos.set(m[1], { url, rol, nombre });
  else if (rol === "portada" && u.rol !== "portada") { u.rol = "portada"; u.nombre = nombre; }
};
for (const c of P) {
  const cat = slug(c.id.replace(/^NEG-/, ""));
  ver(c.hero, "portada", `${cat}-portada`);
  for (const r of c.rows) {
    ver(r.all_photo, "mosaico", `${cat}-${slug(r.key)}-todas`);
    for (const t of [...r.items, ...(r.more ?? [])]) ver(t.photo, "mosaico", `${cat}-${slug(r.key)}-${slug(t.key)}`);
  }
  for (const g of c.chapters) for (const t of g.items) ver(t.photo, "mosaico", `${cat}-${slug(g.key)}-${slug(t.key)}`);
}

// 2 · Bajar y convertir lo que falta. El mismo nombre para dos fotos distintas lleva un número.
mkdirSync(DESTINO, { recursive: true });
const nombres = new Set(Object.values(mapa.fotos).map((f) => f.archivo.replace(/\.[0-9a-f]{8}\.webp$/, "")));
const ancho = (rol) => (rol === "portada" ? { w: 1080, h: 720 } : null);
async function convertir(id, u) {
  const via = u.rol === "portada" ? "w=1080" : "h=240"; // Pexels reduce primero (la original pesa MB); sharp deja el WebP final
  const r = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&${via}`);
  if (r.status === 404) return null; // la foto ya no existe en Pexels: hoy ya sale como un mosaico gris; queda sin foto (null), no con una dirección ajena
  if (!r.ok) throw new Error(`Pexels ${id}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let img = sharp(buf).rotate(); // aplica la orientación y NO conserva metadatos (sharp los descarta si no se pide withMetadata)
  const m = await img.metadata();
  if (u.rol === "portada") {
    // 1080 de ancho; si fuera muy alta se recorta al centro (la caja es una franja ancha y el fondo se centra: se ve igual).
    img = img.resize({ width: Math.min(1080, m.width ?? 1080), withoutEnlargement: true });
    const alto = Math.round(((m.height ?? 1) * Math.min(1080, m.width ?? 1080)) / (m.width ?? 1));
    if (alto > ancho("portada").h) img = img.resize({ width: 1080, height: ancho("portada").h, fit: "cover", position: "centre" });
    return img.webp({ quality: 76, effort: 5 }).toBuffer();
  }
  // Mosaico: lado corto 200 (la caja más grande mide 112 × 80); el lado largo, hasta 400 recortado al centro (como `background-position: center`).
  const w = m.width ?? 1, h = m.height ?? 1, k = 200 / Math.min(w, h);
  img = img.resize({ width: Math.round(w * k), height: Math.round(h * k), withoutEnlargement: true });
  const ow = Math.round(w * k), oh = Math.round(h * k);
  if (Math.max(ow, oh) > 400) img = img.resize({ width: Math.min(ow, 400), height: Math.min(oh, 400), fit: "cover", position: "centre" });
  return img.webp({ quality: 74, effort: 5 }).toBuffer();
}
const ids = [...usos.keys()];
let hechas = 0, bajadas = 0;
const perdidas = [];
const cola = [...ids];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cola.length) {
    const id = cola.shift(), u = usos.get(id), previo = mapa.fotos[id];
    if (previo && existsSync(join(DESTINO, previo.archivo)) && (previo.rol === "portada" || u.rol === "mosaico")) { hechas++; continue; }
    let buf;
    for (let i = 1; ; i++) { try { buf = await convertir(id, u); break; } catch (e) { if (i >= 4) throw e; await new Promise((r) => setTimeout(r, 800 * i)); } }
    if (!buf) { perdidas.push(id); continue; }
    let base = u.nombre, n = 2;
    while (nombres.has(base)) base = `${u.nombre}-${n++}`;
    nombres.add(base);
    const huella = createHash("sha256").update(buf).digest("hex").slice(0, 8);
    const archivo = `${base}.${huella}.webp`;
    writeFileSync(join(DESTINO, archivo), buf);
    mapa.fotos[id] = { archivo, rol: u.rol, bytes: buf.length };
    bajadas++;
  }
}));

// 3 · Reescribir las direcciones.
const nueva = (url) => { const m = typeof url === "string" ? PEXELS.exec(url) : null; return m ? (mapa.fotos[m[1]] ? `/paginas/${mapa.fotos[m[1]].archivo}` : null) : url; };
for (const c of P) {
  c.hero = nueva(c.hero);
  for (const r of c.rows) {
    r.all_photo = nueva(r.all_photo);
    for (const t of [...r.items, ...(r.more ?? [])]) t.photo = nueva(t.photo);
  }
  for (const g of c.chapters) for (const t of g.items) t.photo = nueva(t.photo);
}
const orden = Object.fromEntries(Object.entries(mapa.fotos).sort((a, b) => Number(a[0]) - Number(b[0])));
mapa.fotos = orden;
writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + "\n");
writeFileSync(JSON_PAGINAS, JSON.stringify(P, null, 1) + "\n");
const total = Object.values(orden).reduce((s, f) => s + f.bytes, 0);
if (perdidas.length) console.log(`sin foto (ya no existen en Pexels, quedan en null): ${perdidas.join(", ")}`);
console.log(`fotos de páginas: ${ids.length} distintas · ${bajadas} bajadas ahora, ${hechas} ya estaban · ${(total / 1024).toFixed(0)} KB en total`);
