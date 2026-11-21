#!/usr/bin/env node
/* 9t · Medios en flujo · Cuánta memoria del proceso de la app gasta subir un video, subir una foto y entregar fotos privadas. Pasa los archivos
   por el MISMO código que corre en producción (las rutas reales de apps/web, transpiladas: pruebas/lib/ts-servidor.cjs cargarApp) con dobles del
   almacén y del servicio de video (pruebas/lib/dobles-medios.cjs: servidores en 127.0.0.1, sin red ni docker) y dice el pico de memoria
   residente (RSS) de cada caso, cada uno en su propio proceso (el pico de uno no se mezcla con otro).
   Uso:
     node scripts/carga/memoria-medios.mjs                    el código de este árbol
     node scripts/carga/memoria-medios.mjs --ref fd1f1ee      el código de ese commit (para comparar «antes» y «después»)
     node scripts/carga/memoria-medios.mjs --mb 120 --solo video
   Casos: video (un video de --mb MB, 120 por omisión, el tope de la ruta) · foto (una foto JPEG de ~12 MB por /api/reclamo/documento, una y 4 a
   la vez) · entrega (50 entregas a la vez de una foto privada de 1,5 MB por /api/entrega/foto/<id>; y con If-None-Match si el código lo sabe).
   «pico» es el pico de RSS del núcleo durante el caso (VmHWM, puesto en cero al empezar); «pico − base» es lo que el caso sumó a un proceso
   ya cargado. Nada de esto se sirve ni toca una base de verdad. */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, createReadStream, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const YO = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const REF = opt("ref", null), MB = Number(opt("mb", "120")), SOLO = opt("solo", null), HIJO = opt("hijo", null);
const MiB = 1024 * 1024;
const mb = (b) => `${(b / MiB).toFixed(1)} MB`;

if (HIJO) await hijo(HIJO);
else await padre();

async function padre() {
  const { almacen, video } = require("../../pruebas/lib/dobles-medios.cjs");
  const sharp = require(require.resolve("sharp", { paths: [join(fileURLToPath(new URL("../../apps/web/", import.meta.url)))] }));
  const dir = mkdtempSync(join(tmpdir(), "memoria-medios-"));
  // La foto de ~12 MB: ruido de color a 4000×3000 en JPEG q100 (casi no comprime: así llega al tope como la de una cámara buena).
  const W = 4000, H = 3000, raw = Buffer.alloc(W * H * 3);
  let x = 7; for (let i = 0; i < raw.length; i++) { x = (x * 1103515245 + 12345) >>> 0; raw[i] = (x >>> 16) & 0xff; }
  // El ruido no comprime: se baja la calidad hasta quedar justo debajo del tope de 12 MB (una foto válida, no recortada).
  let foto = null;
  for (let q = 100; q >= 40 && !(foto && foto.length <= 12 * MiB - 8192); q -= 2) foto = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: q, chromaSubsampling: "4:4:4" }).toBuffer();
  const fotoRuta = join(dir, "foto.jpg"); writeFileSync(fotoRuta, foto);
  const portada = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#3a6" } }).jpeg().toBuffer();
  const S3 = await almacen(), V = await video({ portada, mp4Bytes: 8 * MiB });
  S3.objetos.set("privado/e/memoria.jpg", { bytes: Math.round(1.5 * MiB), etag: '"5f2b6c0a0c1e4c7f9d3e2a1b0c9d8e7f"', tipo: "image/jpeg" });
  const env = { ...process.env, MEDIOS_S3_URL: S3.url, MEDIOS_KEY_ID: "doble", MEDIOS_SECRET: "doble", MEDIOS_BUCKET: "medios", VIDEO_URL: V.url, TMPDIR: dir };
  const casos = [["video", ["--mb", String(MB)]], ["foto", ["--n", "1", "--foto", fotoRuta]], ["foto", ["--n", "4", "--foto", fotoRuta]], ["entrega", []]].filter(([c]) => !SOLO || SOLO === c);
  console.log(`memoria-medios · código: ${REF ? `commit ${REF}` : "este árbol"} · Node ${process.version}`);
  const filas = [];
  for (const [c, extra] of casos) {
    // Los dobles corren en ESTE proceso; el caso, en otro (asíncrono: este proceso sigue atendiendo a los dobles).
    const r = await new Promise((ok) => {
      const { spawn } = require("node:child_process");
      const h = spawn(process.execPath, ["--expose-gc", YO, "--hijo", c, ...extra, ...(REF ? ["--ref", REF] : [])], { env, stdio: ["ignore", "pipe", "inherit"] });
      let out = ""; h.stdout.on("data", (d) => { out += d; }); h.on("close", (code) => ok({ code, out }));
    });
    const l = r.out.trim().split("\n").filter((x) => x.startsWith("{")).map((x) => JSON.parse(x));
    if (r.code !== 0 || !l.length) { console.log(`  ✗ ${c}: el caso terminó con código ${r.code}\n${r.out}`); filas.push({ caso: c, error: true }); continue; }
    for (const m of l) {
      filas.push(m);
      console.log(`  ${m.caso.padEnd(34)} estado ${String(m.status).padEnd(9)} base ${mb(m.base).padStart(9)} · pico ${mb(m.pico).padStart(9)} · pico − base ${mb(m.pico - m.base).padStart(9)} ${m.hwm ? "" : " (sin VmHWM: solo muestreo)"}${m.nota ? ` · ${m.nota}` : ""}`);
    }
  }
  const v = V.recibidos.at(-1);
  if (v) console.log(`  (el servicio de video recibió ${mb(v.bytes)} con content-length ${v.largo >= 0 ? mb(v.largo) : "—"}; pico de videos a la vez en el servicio: ${V.pico()})`);
  await S3.cerrar(); await V.cerrar();
  rmSync(dir, { recursive: true, force: true });
  process.exit(filas.some((f) => f.error) ? 1 : 0);
}

async function hijo(caso) {
  const { cargarApp } = require("../../pruebas/lib/ts-servidor.cjs");
  const { formularioEnFlujo } = require("../../pruebas/lib/dobles-medios.cjs");
  const { NextRequest } = require(require.resolve("next/server", { paths: [fileURLToPath(new URL("../../apps/web/", import.meta.url))] }));
  const yo = { id: "00000000-0000-4000-8000-000000000001" };
  const base = {
    db: () => ({ query: async (sql) => {
      if (/select plan from business_stats_cache/.test(sql)) return { rows: [{ plan: "pro" }], rowCount: 1 };
      if (/count\(\*\)/.test(sql)) return { rows: [{ n: 0 }], rowCount: 1 };
      if (/from media m join operations o/.test(sql)) return { rows: [{ url: "privado/e/memoria.jpg", uploaded_by: yo.id, hoy: true, cliente: yo.id, biz: "b1", city: "hazleton", numero: "1" }], rowCount: 1 };
      return { rows: [{ id: "1" }], rowCount: 1 };
    } }),
    tx: async (fn) => fn({ query: async () => ({ rows: [{ id: "1" }], rowCount: 1 }) }),
  };
  const stubs = {
    "@/lib/db": base, "@/lib/cuenta": { mismoOrigen: async () => true, yo: async () => yo }, "@/lib/config": { valor: async () => 30 },
    "@/lib/panel": { accesoPanel: async () => ({ negocio: { id: "b1", city_id: "hazleton" }, yo }) },
    "@/lib/admin": { auditar: async () => undefined, staff: async () => null },
    // El cupo de videos a la vez (si el código lo tiene) siempre deja pasar aquí: se mide la memoria, no el cupo.
    "@/lib/topes": { tomarCupo: async () => "ficha-medida", renovarCupo: async () => true, soltarCupo: async () => undefined },
  };
  const o = REF ? { ref: REF } : {};
  const muestra = { pico: 0 };
  const t = setInterval(() => { muestra.pico = Math.max(muestra.pico, process.memoryUsage().rss); }, 2);
  const medir = async (nombre, fn) => {
    global.gc(); await new Promise((r) => setTimeout(r, 50)); global.gc();
    const b = process.memoryUsage().rss; muestra.pico = b;
    // El pico del núcleo (VmHWM) se pone en cero aquí: el ru_maxrss de un hijo trae el del padre (fork) y el muestreo de JS no ve los picos
    // dentro de una llamada síncrona (Buffer.concat, base64) ni los de sharp. Linux: escribir «5» en clear_refs reinicia VmHWM.
    let hwm = false; try { writeFileSync("/proc/self/clear_refs", "5"); hwm = true; } catch { /* sin /proc: solo el muestreo */ }
    const { status, nota } = await fn();
    muestra.pico = Math.max(muestra.pico, process.memoryUsage().rss);
    const vm = hwm ? Number(/VmHWM:\s+(\d+) kB/.exec(readFileSync("/proc/self/status", "utf8"))?.[1] ?? 0) * 1024 : 0;
    console.log(JSON.stringify({ caso: nombre, status, base: b, pico: Math.max(muestra.pico, vm), muestreo: muestra.pico, hwm: vm, nota }));
  };
  if (caso === "video") {
    const R = cargarApp("apps/web/app/api/negocio/video/route.ts", stubs, o);
    const largo = Math.min(MB * MiB, 120 * MiB) - 1024;
    await medir(`video ${MB} MB`, async () => {
      const f = formularioEnFlujo({ campo: "video", largo });
      const req = new NextRequest("http://127.0.0.1/api/negocio/video?negocio=b1", { method: "POST", body: f.body, duplex: "half", headers: f.headers });
      const r = await R.POST(req); const j = await r.json().catch(() => ({}));
      return { status: r.status, nota: j.ok ? `${j.segundos} s guardado` : j.mensaje?.es };
    });
  } else if (caso === "foto") {
    const R = cargarApp("apps/web/app/api/reclamo/documento/route.ts", stubs, o);
    const n = Number(opt("n", "1")), ruta = opt("foto");
    const largo = statSync(ruta).size;
    await medir(`foto ${mb(largo)} × ${n} a la vez`, async () => {
      const rs = await Promise.all(Array.from({ length: n }, async () => {
        const f = formularioEnFlujo({ campo: "foto", nombre: "doc.jpg", tipo: "image/jpeg", largo, contenido: null });
        // El contenido de verdad (la foto), leído del disco por partes.
        const archivo = Readable.toWeb(createReadStream(ruta, { highWaterMark: 256 * 1024 }));
        const borde = f.headers["content-type"].split("boundary=")[1];
        const partes = (async function* () {
          yield new TextEncoder().encode(`--${borde}\r\nContent-Disposition: form-data; name="foto"; filename="doc.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`);
          for await (const c of archivo) yield c;
          yield new TextEncoder().encode(`\r\n--${borde}--\r\n`);
        })();
        const req = new NextRequest("http://127.0.0.1/api/reclamo/documento", { method: "POST", body: ReadableStream.from(partes), duplex: "half", headers: { "content-type": f.headers["content-type"] } });
        const r = await R.POST(req); await r.arrayBuffer(); return r.status;
      }));
      return { status: [...new Set(rs)].join(","), nota: null };
    });
  } else if (caso === "entrega") {
    const R = cargarApp("apps/web/app/api/entrega/foto/[id]/route.ts", stubs, o);
    const id = "11111111-2222-4333-8444-555555555555";
    const una = async (h = {}) => { const r = await R.GET(new Request(`http://127.0.0.1/api/entrega/foto/${id}`, { headers: h }), { params: Promise.resolve({ id }) }); let n = 0; if (r.body) for await (const c of r.body) n += c.length; return { st: r.status, n, etag: r.headers.get("etag") }; };
    let etag = null;
    await medir("entrega 1,5 MB × 50 a la vez", async () => {
      const rs = await Promise.all(Array.from({ length: 50 }, () => una()));
      etag = rs[0].etag;
      return { status: [...new Set(rs.map((x) => x.st))].join(","), nota: `${mb(rs.reduce((s, x) => s + x.n, 0))} entregados${etag ? ` · ETag ${etag}` : " · sin ETag"}` };
    });
    if (etag) await medir("entrega × 50 con If-None-Match", async () => {
      const rs = await Promise.all(Array.from({ length: 50 }, () => una({ "if-none-match": etag })));
      return { status: [...new Set(rs.map((x) => x.st))].join(","), nota: `${rs.reduce((s, x) => s + x.n, 0)} B de cuerpo` };
    });
  }
  clearInterval(t);
  process.exit(0);
}
