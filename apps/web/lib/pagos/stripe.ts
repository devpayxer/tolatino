import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/* Cliente de la API de Stripe, sin SDK: pocas llamadas, todas con versión fija, clave idempotente en lo que mueve dinero
   y errores traducidos. La clave vive solo en el entorno del servidor (STRIPE_SECRET_KEY); STRIPE_API_BASE permite
   apuntar a stripe-mock en las pruebas de contrato. Nunca se registra la clave ni el cuerpo de una tarjeta. */
const VERSION = "2024-06-20";
export class ErrorStripe extends Error {
  constructor(public tipo: string, public codigo: string | null, public rechazo: string | null, mensaje: string, public estado: number) { super(mensaje); }
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

export async function stripe<T>(metodo: "GET" | "POST", ruta: string, p?: Params, o: { idem?: string } = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ErrorStripe("config", null, null, "Falta STRIPE_SECRET_KEY", 0);
  const base = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
  const cuerpo = p ? formulario(p).join("&") : "";
  const url = metodo === "GET" && cuerpo ? `${base}${ruta}?${cuerpo}` : `${base}${ruta}`;
  const h: Record<string, string> = { authorization: `Bearer ${key}`, "stripe-version": VERSION, "content-type": "application/x-www-form-urlencoded" };
  if (o.idem) h["idempotency-key"] = o.idem;
  let r: Response;
  try { r = await fetch(url, { method: metodo, headers: h, body: metodo === "POST" ? cuerpo : undefined, signal: AbortSignal.timeout(15000) }); }
  catch { throw new ErrorStripe("red", null, null, "No hubo respuesta de Stripe", 0); }
  const j = (await r.json().catch(() => ({}))) as { error?: { type?: string; code?: string; decline_code?: string; message?: string } };
  if (!r.ok) throw new ErrorStripe(j.error?.type ?? "api_error", j.error?.code ?? null, j.error?.decline_code ?? null, j.error?.message ?? `HTTP ${r.status}`, r.status);
  return j as T;
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
