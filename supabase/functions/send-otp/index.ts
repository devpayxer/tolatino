// send-otp — NUESTRA capa de entrega del código de 6 dígitos.
//
// Se conecta como el *Send SMS hook* de Supabase Auth: Supabase genera el
// código, y en vez de mandarlo él nos lo entrega a nosotros. A partir de ahí
// decidimos NOSOTROS por dónde sale.
//
// POR QUÉ EXISTE. No se puede auto-hospedar SMS —hay que estar interconectado
// con AT&T, T-Mobile y Verizon, y eso solo lo dan agregadores con licencia—,
// pero sí se puede ser dueño de toda la capa de encima. Con esta función,
// cambiar de WhatsApp a Twilio, añadir un tercero o cambiar el orden es tocar
// ESTE archivo: ni la app, ni el registro, ni la sesión del usuario se enteran.
//
// ORDEN DE ENTREGA (el primero que esté configurado y funcione):
//   1. WhatsApp (Meta Cloud API, directo, sin intermediarios) — el canal que
//      esta comunidad sí abre.
//   2. SMS (Twilio) — respaldo para quien no tiene WhatsApp.
// Si ninguno está configurado, DEVUELVE ERROR. Nunca responde "ok" sin haber
// entregado nada: un fallo silencioso aquí es un usuario que espera un código
// que jamás llegará, sin que nadie se entere.
//
// SEGURIDAD
// · Firma verificada (Standard Webhooks, HMAC-SHA256) — sin ella cualquiera
//   podría hacer que mandemos mensajes a costa nuestra.
// · Prefijos permitidos: por defecto SOLO +1. Es la defensa nº1 contra el
//   "SMS pumping", el fraude clásico contra un formulario de OTP público:
//   automatizan miles de peticiones a números de tarifa premium en países
//   remotos y se llevan una parte de lo que pagamos. Una noche de eso puede
//   costar cientos de dólares.
// · El código NUNCA se registra en la bitácora, ni completo ni parcial. Del
//   teléfono se guardan solo los 4 últimos dígitos, lo justo para diagnosticar
//   "no me llegó" sin acumular datos personales.
//
// SECRETOS (Edge Function secrets, los pone el fundador):
//   SEND_OTP_HOOK_SECRET   — el `v1,whsec_…` que da Supabase al crear el hook
//   WHATSAPP_TOKEN         — token permanente de la app de Meta
//   WHATSAPP_PHONE_ID      — Phone Number ID del número de WhatsApp Business
//   WHATSAPP_TEMPLATE      — nombre de la plantilla (por defecto `tolatino_otp`)
//   WHATSAPP_LANG          — idioma de la plantilla (por defecto `es`)
//   WHATSAPP_BUTTON        — `false` si la plantilla NO tiene botón de copiar
//   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
//   TWILIO_FROM            — número emisor  (o bien)
//   TWILIO_MESSAGING_SERVICE_SID
//   OTP_ALLOWED_PREFIXES   — lista separada por comas (por defecto `+1`)

const enc = new TextEncoder();

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}
/** Formato que Supabase Auth entiende para enseñar un error al usuario. */
function fail(message: string, status = 500) {
  console.error('send-otp:', message);
  return json({ error: { http_code: status, message } }, status);
}

// ── Firma (Standard Webhooks) ───────────────────────────────────────────────
// Se firma `id.timestamp.body`. El secreto llega como `v1,whsec_<base64>`;
// lo que se usa como clave son los BYTES del base64, no el texto.
async function signatureOk(secretRaw: string, id: string, ts: string, body: string, header: string): Promise<boolean> {
  const b64 = secretRaw.replace(/^v1,\s*/, '').replace(/^whsec_/, '');
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    keyBytes = enc.encode(b64); // secreto en texto plano: se acepta igualmente
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${ts}.${body}`));
  const mine = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // La cabecera puede traer varias firmas separadas por espacio ("v1,xxx v1,yyy").
  return header.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    // Comparación en tiempo constante: evita filtrar la firma byte a byte.
    if (sig.length !== mine.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ mine.charCodeAt(i);
    return diff === 0;
  });
}

// ── Canales ─────────────────────────────────────────────────────────────────
type Result = { ok: true } | { ok: false; error: string };

async function viaWhatsApp(phone: string, code: string): Promise<Result | null> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!token || !phoneId) return null; // no configurado: se pasa al siguiente
  const template = Deno.env.get('WHATSAPP_TEMPLATE') ?? 'tolatino_otp';
  const langCode = Deno.env.get('WHATSAPP_LANG') ?? 'es';
  const withButton = (Deno.env.get('WHATSAPP_BUTTON') ?? 'true') !== 'false';

  // Las plantillas de categoría "authentication" de Meta llevan el código en el
  // cuerpo y, si tienen botón de copiar, TAMBIÉN como parámetro del botón.
  const components: unknown[] = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];
  if (withButton) {
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/^\+/, ''), // Meta quiere el número sin el "+"
        type: 'template',
        template: { name: template, language: { code: langCode }, components },
      }),
    });
    if (res.ok) return { ok: true };
    const txt = await res.text();
    return { ok: false, error: `whatsapp ${res.status}: ${txt.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: `whatsapp: ${String(e).slice(0, 200)}` };
  }
}

async function viaTwilio(phone: string, code: string, lang: string): Promise<Result | null> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM');
  const service = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  if (!sid || !token || (!from && !service)) return null;

  const body = lang === 'en'
    ? `${code} is your To'Latino code. It expires in 10 minutes.`
    : `${code} es tu código de To'Latino. Vence en 10 minutos.`;
  const form = new URLSearchParams({ To: phone, Body: body });
  if (service) form.set('MessagingServiceSid', service);
  else form.set('From', from!);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (res.ok) return { ok: true };
    const txt = await res.text();
    return { ok: false, error: `twilio ${res.status}: ${txt.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: `twilio: ${String(e).slice(0, 200)}` };
  }
}

// ── Bitácora ────────────────────────────────────────────────────────────────
// Sin el código y sin el número completo. Solo lo justo para responder a
// "no me llegó": por qué canal salió, si funcionó y qué dijo el proveedor.
async function log(channel: string, ok: boolean, last4: string, error: string | null) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/otp_deliveries`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ channel, ok, last4, error }),
    });
  } catch { /* la bitácora nunca puede tumbar un envío */ }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('method not allowed', 405);

  const raw = await req.text();

  // 1 · Firma
  const secret = Deno.env.get('SEND_OTP_HOOK_SECRET');
  if (!secret) return fail('SEND_OTP_HOOK_SECRET sin configurar');
  const id = req.headers.get('webhook-id') ?? '';
  const ts = req.headers.get('webhook-timestamp') ?? '';
  const sig = req.headers.get('webhook-signature') ?? '';
  if (!id || !ts || !sig) return fail('faltan cabeceras de firma', 401);
  // Ventana de 5 minutos: corta la reproducción de una petición capturada.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return fail('firma caducada', 401);
  if (!(await signatureOk(secret, id, ts, raw, sig))) return fail('firma inválida', 401);

  // 2 · Contenido
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try { payload = JSON.parse(raw); } catch { return fail('cuerpo ilegible', 400); }
  const phone = (payload.user?.phone ?? '').trim();
  const code = (payload.sms?.otp ?? '').trim();
  if (!phone || !code) return fail('falta el teléfono o el código', 400);

  const e164 = phone.startsWith('+') ? phone : `+${phone}`;
  const last4 = e164.slice(-4);

  // 3 · Prefijos permitidos (anti-fraude)
  const allowed = (Deno.env.get('OTP_ALLOWED_PREFIXES') ?? '+1').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.some((p) => e164.startsWith(p))) {
    await log('blocked', false, last4, `prefijo no permitido`);
    return fail('Ese país todavía no está disponible.', 400);
  }

  // 4 · Entrega, en orden
  const lang = 'es';
  const chain: [string, () => Promise<Result | null>][] = [
    ['whatsapp', () => viaWhatsApp(e164, code)],
    ['sms', () => viaTwilio(e164, code, lang)],
  ];

  const problems: string[] = [];
  for (const [name, send] of chain) {
    const r = await send();
    if (r === null) continue;               // canal sin configurar
    if (r.ok) { await log(name, true, last4, null); return json({}); }
    problems.push(r.error);
    await log(name, false, last4, r.error);  // y se intenta el siguiente
  }

  // Ni un solo canal configurado, o todos fallaron. Se dice en voz alta.
  return fail(problems.length
    ? `ningún canal pudo entregar: ${problems.join(' | ')}`
    : 'no hay ningún canal de envío configurado (WhatsApp ni Twilio)');
});
