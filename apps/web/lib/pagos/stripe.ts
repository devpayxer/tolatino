import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/* Cliente de la API de Stripe, sin SDK: pocas llamadas, todas con versión fija, clave idempotente en lo que mueve dinero
   y errores traducidos. La clave vive solo en el entorno del servidor (STRIPE_SECRET_KEY); STRIPE_API_BASE permite
   apuntar a stripe-mock en las pruebas de contrato. Nunca se registra la clave ni el cuerpo de una tarjeta. */
const VERSION = "2024-06-20";
export class ErrorStripe extends Error {
  /* 9k · `intento`: el PaymentIntent que Stripe devuelve con el error (fuera de sesión, «authentication_required»: hay que traer al dueño a confirmarlo). */
  constructor(public tipo: string, public codigo: string | null, public rechazo: string | null, mensaje: string, public estado: number, public intento: { id: string; client_secret?: string; status?: string } | null = null) { super(mensaje); }
}
type Params = Record<string, unknown>;

/* Codifica objetos anidados como los quiere Stripe: a[b][c]=x, a[0]=y. */
export function formulario(p: Params, prefijo = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null) continue;
    const key = prefijo ? `${prefijo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => { if (x && typeof x === "object") out.push(...formulario(x as Params, `${key}[${i}]`)); else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`); });
    else if (typeof v === "object") out.push(...formulario(v as Params, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

export async function stripe<T>(metodo: "GET" | "POST", ruta: string, p?: Params, o: { idem?: string; cuenta?: string } = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ErrorStripe("config", null, null, "Falta STRIPE_SECRET_KEY", 0);
  const base = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
  const cuerpo = p ? formulario(p).join("&") : "";
  const url = metodo === "GET" && cuerpo ? `${base}${ruta}?${cuerpo}` : `${base}${ruta}`;
  const h: Record<string, string> = { authorization: `Bearer ${key}`, "stripe-version": VERSION, "content-type": "application/x-www-form-urlencoded" };
  if (o.idem) h["idempotency-key"] = o.idem;
  // 9k · Lo de una cuenta conectada (sus payouts) se lee con su cabecera Stripe-Account.
  if (o.cuenta) h["stripe-account"] = o.cuenta;
  let r: Response;
  try { r = await fetch(url, { method: metodo, headers: h, body: metodo === "POST" ? cuerpo : undefined, signal: AbortSignal.timeout(15000) }); }
  catch { throw new ErrorStripe("red", null, null, "No hubo respuesta de Stripe", 0); }
  const j = (await r.json().catch(() => ({}))) as { error?: { type?: string; code?: string; decline_code?: string; message?: string; payment_intent?: { id?: string; client_secret?: string; status?: string } } };
  if (!r.ok) {
    const pi = j.error?.payment_intent;
    throw new ErrorStripe(j.error?.type ?? "api_error", j.error?.code ?? null, j.error?.decline_code ?? null, j.error?.message ?? `HTTP ${r.status}`, r.status, pi?.id ? { id: pi.id, client_secret: pi.client_secret, status: pi.status } : null);
  }
  return j as T;
}

/* 9k · Subir un archivo (evidencia de una disputa) por la API de archivos de Stripe: multipart a files.stripe.com (STRIPE_FILES_BASE; en el contrato,
   el mismo stripe-mock). Idempotente por `idem`. Devuelve el id «file_…». Nunca se registra el contenido. */
export async function stripeArchivo(x: { cuerpo: Buffer; nombre: string; tipo: string; idem: string }): Promise<{ id: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ErrorStripe("config", null, null, "Falta STRIPE_SECRET_KEY", 0);
  const base = (process.env.STRIPE_FILES_BASE || process.env.STRIPE_API_BASE || "https://files.stripe.com").replace(/\/$/, "");
  const f = new FormData();
  f.append("purpose", "dispute_evidence");
  f.append("file", new Blob([new Uint8Array(x.cuerpo)], { type: x.tipo }), x.nombre);
  let r: Response;
  try { r = await fetch(`${base}/v1/files`, { method: "POST", headers: { authorization: `Bearer ${key}`, "stripe-version": VERSION, "idempotency-key": x.idem }, body: f, signal: AbortSignal.timeout(30000) }); }
  catch { throw new ErrorStripe("red", null, null, "No hubo respuesta de Stripe", 0); }
  const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { type?: string; code?: string; message?: string } };
  if (!r.ok || !j.id) throw new ErrorStripe(j.error?.type ?? "api_error", j.error?.code ?? null, null, j.error?.message ?? `HTTP ${r.status}`, r.status);
  return { id: j.id };
}

/* Firma del webhook (Stripe-Signature: t=…,v1=…): HMAC-SHA256 de «t.cuerpo» con el secreto del endpoint, en tiempo
   constante y con 5 minutos de tolerancia (evita repetir eventos viejos). */
export function firmaValida(cuerpo: string, cabecera: string | null, secreto: string, ahora = Math.floor(Date.now() / 1000)): boolean {
  if (!cabecera || !secreto) return false;
  const partes = Object.fromEntries(cabecera.split(",").map((x) => x.split("=") as [string, string]).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const t = Number(partes.t);
  if (!Number.isFinite(t) || Math.abs(ahora - t) > 300) return false;
  const esperado = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex");
  const firmas = cabecera.split(",").filter((x) => x.trim().startsWith("v1=")).map((x) => x.trim().slice(3));
  return firmas.some((f) => f.length === esperado.length && timingSafeEqual(Buffer.from(f), Buffer.from(esperado)));
}
