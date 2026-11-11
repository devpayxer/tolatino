import "server-only";
import { createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";

/* 7h · Los proveedores de WhatsApp y SMS de El Compa (fase7-compa.md §3 «Canales WhatsApp y SMS»; guardián canalConFirma). El ÚNICO archivo de
   El Compa que habla con Telnyx (SMS) o con Meta (WhatsApp Cloud API) y lee sus secretos del entorno. Todo lo demás (identidad, turno, bajas,
   silencio, ventana de 24 h) vive en canales.ts y no sabe qué proveedor corre.
   - Firmas: la entrada se verifica ANTES de leer el JSON. Telnyx firma «{telnyx-timestamp}|{cuerpo}» con Ed25519 (su llave pública,
     TELNYX_PUBLIC_KEY); la hora firmada tiene que estar dentro de compa_canal_firma_seg (repetición). Meta firma el cuerpo con HMAC-SHA256 y
     el secreto de la app (WHATSAPP_APP_SECRET) en X-Hub-Signature-256: se compara en tiempo constante; su hora va en cada mensaje (24 h, la
     ventana de WhatsApp). Sin secreto en el entorno, nada entra (nunca «sin firma = vale»).
   - Salida: POST /v2/messages de Telnyx y POST /{version}/{phone_number_id}/messages de Meta, con el texto plano. En el sandbox no hay llaves:
     contesta el simulador (canales.ts) y nada sale. Las llaves van a los secretos del entorno, nunca al repo ni al chat. */
export type Proveedor = "telnyx" | "whatsapp";
export type Entrante = { proveedor: Proveedor | "sim"; canal: "sms" | "whatsapp"; id: string; de: string; para: string; texto: string; media: boolean; hora: Date | null };
export type Firma = { ok: true } | { ok: false; motivo: "firma" | "hora" | "sin_secreto" };

export const CUERPO_MAX = 64 * 1024;
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

/* Telnyx: Ed25519 sobre «timestamp|cuerpo». `ahora` y `ventana` en segundos. */
export function firmaTelnyx(cuerpo: Buffer, firma: string | null, hora: string | null, ahora: number, ventana: number): Firma {
  const llave = process.env.TELNYX_PUBLIC_KEY ?? "";
  if (!llave) return { ok: false, motivo: "sin_secreto" };
  if (!firma || !hora || !/^\d{9,11}$/.test(hora)) return { ok: false, motivo: "firma" };
  let ok = false;
  try {
    const raw = Buffer.from(llave, "base64"), sig = Buffer.from(firma, "base64");
    if (raw.length !== 32 || sig.length !== 64) return { ok: false, motivo: "firma" };
    const k = createPublicKey({ key: Buffer.concat([SPKI_ED25519, raw]), format: "der", type: "spki" });
    ok = verify(null, Buffer.concat([Buffer.from(`${hora}|`, "utf8"), cuerpo]), k, sig);
  } catch { ok = false; }
  if (!ok) return { ok: false, motivo: "firma" };
  // La hora va DENTRO de lo firmado: una entrada vieja (o del futuro) es una repetición.
  if (Math.abs(ahora - Number(hora)) > ventana) return { ok: false, motivo: "hora" };
  return { ok: true };
}

/* Meta (WhatsApp Cloud API): HMAC-SHA256 del cuerpo con el secreto de la app; «sha256=<hex>»; comparación en tiempo constante. */
export function firmaWhatsApp(cuerpo: Buffer, firma: string | null): Firma {
  const secreto = process.env.WHATSAPP_APP_SECRET ?? "";
  if (!secreto) return { ok: false, motivo: "sin_secreto" };
  const m = /^sha256=([a-f0-9]{64})$/.exec(String(firma ?? "").trim());
  if (!m) return { ok: false, motivo: "firma" };
  const a = Buffer.from(m[1]!, "hex"), b = createHmac("sha256", secreto).update(cuerpo).digest();
  return a.length === b.length && timingSafeEqual(a, b) ? { ok: true } : { ok: false, motivo: "firma" };
}

/* La verificación del webhook de Meta (GET con hub.verify_token): en tiempo constante; devuelve el reto o null. */
export function retoWhatsApp(modo: string | null, token: string | null, reto: string | null): string | null {
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  if (esperado.length < 16 || modo !== "subscribe" || !token || !reto || !/^[A-Za-z0-9_-]{1,100}$/.test(reto)) return null;
  const a = Buffer.from(token), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b) ? reto : null;
}

const txt = (x: unknown, n = 2000) => (typeof x === "string" ? x : "").slice(0, n);
/* Lo que trae una entrada de Telnyx (message.received). Lo demás (los avisos de entrega de lo que mandamos) no es un mensaje: []. */
export function leerTelnyx(j: unknown): Entrante[] {
  const d = (j as { data?: { event_type?: string; occurred_at?: string; payload?: Record<string, unknown> } })?.data;
  if (!d || d.event_type !== "message.received" || !d.payload) return [];
  const p = d.payload as { id?: unknown; direction?: unknown; from?: { phone_number?: unknown }; to?: { phone_number?: unknown }[]; text?: unknown; media?: unknown[]; received_at?: unknown };
  if (p.direction && p.direction !== "inbound") return [];
  const id = txt(p.id, 200), de = txt(p.from?.phone_number, 40), para = txt(Array.isArray(p.to) ? p.to[0]?.phone_number : "", 40);
  if (!id || !de || !para) return [];
  const h = Date.parse(txt(p.received_at, 40) || txt(d.occurred_at, 40));
  return [{ proveedor: "telnyx", canal: "sms", id, de, para, texto: txt(p.text), media: Array.isArray(p.media) && p.media.length > 0, hora: Number.isFinite(h) ? new Date(h) : null }];
}

/* Lo que trae una entrada de Meta: solo los mensajes (los «statuses» de lo que mandamos no son mensajes). */
export function leerWhatsApp(j: unknown): Entrante[] {
  const out: Entrante[] = [];
  const o = j as { object?: string; entry?: { changes?: { field?: string; value?: { metadata?: { phone_number_id?: unknown }; messages?: Record<string, unknown>[] } }[] }[] };
  if (o?.object !== "whatsapp_business_account" || !Array.isArray(o.entry)) return out;
  for (const e of o.entry.slice(0, 20)) for (const c of (e?.changes ?? []).slice(0, 20)) {
    if (c?.field !== "messages" || !c.value) continue;
    const para = txt(c.value.metadata?.phone_number_id, 40);
    for (const m of (c.value.messages ?? []).slice(0, 50)) {
      const id = txt(m.id, 200), de = txt(m.from, 40), tipo = txt(m.type, 20);
      if (!id || !de || !para) continue;
      const t = tipo === "text" ? txt((m.text as { body?: unknown })?.body)
        : tipo === "button" ? txt((m.button as { text?: unknown })?.text)
          : tipo === "interactive" ? txt((m.interactive as { button_reply?: { title?: unknown }; list_reply?: { title?: unknown } })?.button_reply?.title ?? (m.interactive as { list_reply?: { title?: unknown } })?.list_reply?.title) : "";
      const s = Number(txt(m.timestamp, 20));
      out.push({ proveedor: "whatsapp", canal: "whatsapp", id, de: de.startsWith("+") ? de : `+${de}`, para, texto: t, media: !t, hora: Number.isFinite(s) && s > 0 ? new Date(s * 1000) : null });
    }
  }
  return out;
}

/* ¿Hay llaves para mandar de verdad? (sin ellas: el simulador en el sandbox, nada en producción). */
export function hayLlaves(p: Proveedor): boolean {
  return p === "telnyx" ? !!(process.env.TELNYX_API_KEY && process.env.TOLATINO_SMS_MODO === "telnyx") : !!process.env.WHATSAPP_TOKEN;
}

const API_TELNYX = () => (process.env.TELNYX_API_BASE || "https://api.telnyx.com").replace(/\/$/, "");
const API_META = () => (process.env.WHATSAPP_API_BASE || "https://graph.facebook.com").replace(/\/$/, "");
const VERSION_META = "v23.0";
export type Envio = { ok: true; id: string | null } | { ok: false; error: string };

/* Manda un texto plano. `de` = el número que recibió (SMS: E.164; WhatsApp: phone_number_id); `para` = E.164. Nunca lanza. */
export async function mandar(p: Proveedor, de: string, para: string, texto: string): Promise<Envio> {
  try {
    if (p === "telnyx") {
      const key = process.env.TELNYX_API_KEY;
      if (!key) return { ok: false, error: "sin_llave" };
      const r = await fetch(`${API_TELNYX()}/v2/messages`, { method: "POST", signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ from: de, to: para, text: texto, type: "SMS" }) });
      const j = (await r.json().catch(() => null)) as { data?: { id?: string } } | null;
      return r.ok ? { ok: true, id: j?.data?.id ?? null } : { ok: false, error: `telnyx_${r.status}` };
    }
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) return { ok: false, error: "sin_llave" };
    if (!/^\d{6,20}$/.test(de)) return { ok: false, error: "numero" };
    const r = await fetch(`${API_META()}/${VERSION_META}/${de}/messages`, { method: "POST", signal: AbortSignal.timeout(8000),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: para.replace(/^\+/, ""), type: "text", text: { preview_url: false, body: texto } }) });
    const j = (await r.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    return r.ok ? { ok: true, id: j?.messages?.[0]?.id ?? null } : { ok: false, error: `meta_${r.status}` };
  } catch {
    return { ok: false, error: "red" };
  }
}
