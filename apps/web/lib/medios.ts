import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { pipeline } from "node:stream/promises";

/* Almacenamiento de fotos: S3 propio (Garage, autoalojado; decisión en infra/pruebas/docker-compose.yml). Firma SigV4
   escrita aquí (sin SDK). Las llaves vienen del entorno (las crea deploy.sh en el servidor; nunca en el repo). Las
   fotos se sirven públicas por nginx en /medios/<clave> (sitio web del bucket). */
const C = () => ({
  url: process.env.MEDIOS_S3_URL ?? "", key: process.env.MEDIOS_KEY_ID ?? "", secret: process.env.MEDIOS_SECRET ?? "",
  bucket: process.env.MEDIOS_BUCKET ?? "medios", region: process.env.MEDIOS_REGION ?? "garage",
});
export const mediosListos = () => { const c = C(); return !!(c.url && c.key && c.secret); };
export const urlPublica = (clave: string) => `/medios/${clave}`;

const h = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const hmac = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s).digest();

/* PUT de un objeto (path-style: <url>/<bucket>/<clave>). */
export async function guardarObjeto(clave: string, cuerpo: Buffer, tipo: string) {
  return pedir("PUT", clave, cuerpo, tipo);
}
/* GET de un objeto privado (documentos de reclamo): solo el servidor, con permiso revisado por quien llama. */
export async function leerObjeto(clave: string): Promise<Buffer> {
  return (await pedir("GET", clave)) as Buffer;
}
/* DELETE de un objeto: el borrado de fotos privadas que vencen (ayuda de Salud y Pro, 90 días después de cerrarse). */
export async function borrarObjeto(clave: string) {
  await pedir("DELETE", clave);
}
/* HEAD de un objeto: ¿sigue ahí? (Fotos a la medida: después de guardar las variantes se confirma que la maestra no se borró mientras tanto
   —la purga de una cuenta—; si se borró, las variantes recién guardadas también salen). 404 → false; otro error, se lanza. */
export async function existeObjeto(clave: string): Promise<boolean> {
  return (await pedir("HEAD", clave)) === true;
}
/* La petición firmada (SigV4) a <url>/<bucket>/<clave>. `hp` es el sha256 del cuerpo (hex); `extra` son cabeceras que no se firman (If-None-Match). */
function firmar(metodo: "PUT" | "GET" | "DELETE" | "HEAD", clave: string, hp: string, tipo?: string): { u: URL; headers: Record<string, string> } {
  const c = C();
  if (!mediosListos()) throw new Error("almacenamiento sin configurar");
  if (!/^[a-z0-9][a-z0-9/._-]{2,120}$/.test(clave)) throw new Error("clave inválida");
  const u = new URL(`${c.url.replace(/\/$/, "")}/${c.bucket}/${clave}`);
  const ahora = new Date(), fecha = ahora.toISOString().replace(/[-:]|\.\d{3}/g, ""), dia = fecha.slice(0, 8);
  const privado = clave.startsWith("privado/");
  const cab: Record<string, string> = metodo === "PUT"
    ? { host: u.host, "content-type": tipo ?? "application/octet-stream", "x-amz-content-sha256": hp, "x-amz-date": fecha, "cache-control": privado ? "private, no-store" : "public, max-age=31536000, immutable" }
    : { host: u.host, "x-amz-content-sha256": hp, "x-amz-date": fecha };
  const nombres = Object.keys(cab).sort();
  const canon = [metodo, u.pathname, "", nombres.map((n) => `${n}:${cab[n]}`).join("\n") + "\n", nombres.join(";"), hp].join("\n");
  const alcance = `${dia}/${c.region}/s3/aws4_request`;
  const aFirmar = ["AWS4-HMAC-SHA256", fecha, alcance, h(canon)].join("\n");
  const kFirma = hmac(hmac(hmac(hmac(`AWS4${c.secret}`, dia), c.region), "s3"), "aws4_request");
  const firma = createHmac("sha256", kFirma).update(aFirmar).digest("hex");
  return { u, headers: { ...cab, authorization: `AWS4-HMAC-SHA256 Credential=${c.key}/${alcance}, SignedHeaders=${nombres.join(";")}, Signature=${firma}` } };
}
async function pedir(metodo: "PUT" | "GET" | "DELETE" | "HEAD", clave: string, cuerpo?: Buffer, tipo?: string): Promise<Buffer | boolean | void> {
  const { u, headers } = firmar(metodo, clave, h(cuerpo ?? ""), tipo);
  const r = await fetch(u, { method: metodo, body: metodo === "PUT" ? new Uint8Array(cuerpo!) : undefined, headers });
  if (metodo === "HEAD" && (r.ok || r.status === 404)) return r.ok;
  if (!r.ok && !(metodo === "DELETE" && r.status === 404)) throw new Error(`almacenamiento ${r.status}: ${(await r.text()).slice(0, 200)}`);
  if (metodo === "GET") return Buffer.from(await r.arrayBuffer());
}

/* 9t · Medios en flujo · PUT de un ARCHIVO del disco sin cargarlo en memoria (el video procesado: hasta decenas de MB). El sha256 que firma la
   petición sale de una pasada por partes (o del que ya se calculó al escribirlo); el cuerpo va por partes con su content-length. */
export async function guardarArchivo(clave: string, ruta: string, tipo: string, sha256?: string) {
  const bytes = (await stat(ruta)).size;
  let hp = sha256;
  if (!hp) { const x = createHash("sha256"); for await (const c of createReadStream(ruta, { highWaterMark: 1 << 20 })) x.update(c as Buffer); hp = x.digest("hex"); }
  const { u, headers } = firmar("PUT", clave, hp, tipo);
  const r = await enviarArchivo(u, { metodo: "PUT", ruta, bytes, headers, ms: 300_000 });
  const st = r.statusCode ?? 0, texto = await textoConTope(r, 4096);
  if (st < 200 || st >= 300) throw new Error(`almacenamiento ${st}: ${texto.slice(0, 200)}`);
}

/* Mandar un archivo del disco como cuerpo de un pedido HTTP, por partes y con el freno de la red (pipeline de node:http). No con fetch: la
   medida (scripts/carga/memoria-medios.mjs) vio al fetch de Node 22 (undici) leer el archivo a su cola mucho más rápido de lo que la red lo
   lleva, con cualquier cuerpo en flujo (~150 MB de memoria para un archivo de 120 MB); con node:http el mismo envío no pasa de unos pocos MB.
   Devuelve la respuesta (también en flujo: quien llama la lee o la suelta). */
export function enviarArchivo(url: URL | string, o: { metodo: "PUT" | "POST"; ruta: string; bytes: number; headers: Record<string, string>; ms?: number }): Promise<IncomingMessage> {
  const u = typeof url === "string" ? new URL(url) : url;
  return new Promise<IncomingMessage>((ok, no) => {
    const pedido = (u.protocol === "https:" ? httpsRequest : httpRequest)(u, {
      method: o.metodo, headers: { ...o.headers, "content-length": String(o.bytes) }, signal: o.ms ? AbortSignal.timeout(o.ms) : undefined,
    }, ok);
    pedido.on("error", no);
    pipeline(createReadStream(o.ruta, { highWaterMark: 1 << 20 }), pedido).catch(no);
  });
}
/* El cuerpo de una respuesta de enviarArchivo como texto, con tope (un error es chico; nunca una respuesta grande a memoria). */
export async function textoConTope(r: IncomingMessage, tope = 64 * 1024): Promise<string> {
  const partes: Buffer[] = [];
  let n = 0;
  for await (const c of r) { n += (c as Buffer).length; if (n > tope) { r.destroy(); break; } partes.push(c as Buffer); }
  return Buffer.concat(partes).toString("utf8").slice(0, tope);
}

/* 9t · Medios en flujo · GET de un objeto privado POR PARTES, para entregarlo tal cual (lib/entrega-privada.ts). `siNoCoincide` es el
   If-None-Match de quien pide: va al almacén (S3 contesta 304 sin cuerpo) y, si el almacén lo ignora y la versión es la misma, el cuerpo se
   suelta sin leerlo. El ETag es el del almacén (de la versión del objeto: cambia si el contenido cambia). 404 → null; otro error, se lanza.
   Solo el servidor, con el permiso ya revisado por quien llama (guardián mediosEnFlujo). */
export type Abierto = { estado: 200; cuerpo: ReadableStream<Uint8Array>; etag: string | null; largo: number | null } | { estado: 304; etag: string };
export async function abrirObjeto(clave: string, siNoCoincide?: string | null): Promise<Abierto | null> {
  const { u, headers } = firmar("GET", clave, h(""));
  const inm = (siNoCoincide ?? "").trim().slice(0, 200);
  const r = await fetch(u, { method: "GET", headers: inm ? { ...headers, "if-none-match": inm } : headers });
  const etag = r.headers.get("etag");
  if (r.status === 304) return { estado: 304, etag: etag ?? inm };
  if (r.status === 404) { await r.body?.cancel().catch(() => undefined); return null; }
  if (!r.ok || !r.body) throw new Error(`almacenamiento ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
  if (etag && inm && coincide(inm, etag)) { await r.body.cancel().catch(() => undefined); return { estado: 304, etag }; }
  const largo = Number(r.headers.get("content-length") ?? "");
  return { estado: 200, cuerpo: r.body, etag, largo: Number.isFinite(largo) && largo >= 0 ? largo : null };
}
/* If-None-Match: una lista de ETags (o «*»); comparación débil como pide RFC 9110 para If-None-Match. */
export function coincide(inm: string, etag: string): boolean {
  const limpio = (x: string) => x.trim().replace(/^W\//, "");
  if (inm.trim() === "*") return true;
  return inm.split(",").some((x) => limpio(x) === limpio(etag));
}
