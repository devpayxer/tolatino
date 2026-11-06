import "server-only";
import { createHash, createHmac } from "node:crypto";

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
async function pedir(metodo: "PUT" | "GET" | "DELETE", clave: string, cuerpo?: Buffer, tipo?: string): Promise<Buffer | void> {
  const c = C();
  if (!mediosListos()) throw new Error("almacenamiento sin configurar");
  if (!/^[a-z0-9][a-z0-9/._-]{2,120}$/.test(clave)) throw new Error("clave inválida");
  const u = new URL(`${c.url.replace(/\/$/, "")}/${c.bucket}/${clave}`);
  const ahora = new Date(), fecha = ahora.toISOString().replace(/[-:]|\.\d{3}/g, ""), dia = fecha.slice(0, 8);
  const hp = h(cuerpo ?? "");
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
  const r = await fetch(u, { method: metodo, body: metodo === "PUT" ? new Uint8Array(cuerpo!) : undefined, headers: { ...cab, authorization: `AWS4-HMAC-SHA256 Credential=${c.key}/${alcance}, SignedHeaders=${nombres.join(";")}, Signature=${firma}` } });
  if (!r.ok && !(metodo === "DELETE" && r.status === 404)) throw new Error(`almacenamiento ${r.status}: ${(await r.text()).slice(0, 200)}`);
  if (metodo === "GET") return Buffer.from(await r.arrayBuffer());
}
