import "server-only";
import { auditar, type Staff } from "../admin";
import { cifrar, descifrar, huella } from "../cifrado";
import { valor } from "../config";
import { normalizarTelefono } from "../cuenta";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";
import { respuestaAutoCanal, idiomaDe, turno } from "./conversacion";
import { crearEnlace } from "./enlace";
import { hayLlaves, mandar, mandarPlantilla, type Entrante } from "./canales-proveedor";
import { enviarSms } from "../sms";
import { canalEncendido, disponible } from "./interruptores";
import type { Lang } from "./modelo";
import { TAPADO, tapar } from "./tapar";
import { alTope } from "./tope";

/* 7h · El Compa por WhatsApp y SMS (fase7-compa.md §3 «Canales WhatsApp y SMS» y §4 7h; guardianes canalConFirma, compaTapaSecretos,
   compaAccionConfirmada). La ruta /api/compa/entrada/[proveedor] ya verificó la FIRMA del proveedor antes de leer nada; aquí:
   recibir()  → la entrada una sola vez por (proveedor, id del mensaje) (idempotente), el teléfono como HUELLA y cifrado, el texto TAPADO;
   procesar() → aparte (after() y el barrido): STOP / START / HELP primero (siempre se respetan y quedan anotados) → límite por teléfono →
                el número que recibió decide: el de To'Latino = El Compa de los vecinos; el de un negocio = sus respuestas automáticas.
   - Identidad (vecinos): SOLO una cuenta activa con ese teléfono VERIFICADO y «Hablar con El Compa por WhatsApp y SMS» encendido en Mi cuenta ›
     Avisos. Cualquier otra cosa (sin cuenta, sin encender, suspendida, más de una) recibe la MISMA respuesta fija, sin datos (no se sabe si
     el número tiene cuenta). La firma del proveedor prueba que el mensaje vino de Telnyx o de Meta, no quién escribe: por eso la respuesta
     solo va a ESE teléfono y las acciones nunca se hacen por mensaje.
   - Acciones: el turno solo PROPONE; aquí se manda un ENLACE DE UN USO (enlace.ts) que abre la confirmación en la app después de entrar
     como siempre. Nada de este archivo confirma ni ejecuta una acción.
   - Salida (enviar): vuelve a leer el canal (apagado = nada sale), la baja (STOP), la ventana de 24 h de WhatsApp y las horas de silencio
     (una respuesta tardía), y anota cada envío o no-envío en compa_outbound. En el sandbox sin llaves contesta el simulador (nada sale).
   - Nada de esto deja datos personales en el registro del servidor (ni el teléfono, ni el texto). */
type Bi = { es: string; en: string };
type Canal = "sms" | "whatsapp";
const BASE = () => (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");

export const LINEAS_CANAL = {
  fija: (u: string): Bi => ({ es: `Para ayudarte con tus pedidos y citas, entra en To'Latino: ${u} Si ya tienes cuenta, enciende «El Compa por WhatsApp y SMS» en Mi cuenta › Avisos.`,
    en: `To help you with your orders and bookings, sign in to To'Latino: ${u} If you already have an account, turn on «El Compa by WhatsApp and SMS» in My account › Notifications.` }),
  baja: { es: "To'Latino: listo, no te mandamos más mensajes a este número. Para volver, responde START.", en: "To'Latino: done, we won't message this number again. To come back, reply START." },
  alta: { es: "To'Latino: listo, El Compa vuelve a contestarte por aquí. Para salir, responde STOP.", en: "To'Latino: done, El Compa will reply here again. To stop, reply STOP." },
  ayuda: (u: string): Bi => ({ es: `To'Latino · El Compa, el asistente de IA. Cómo funciona: ${u} Para salir, responde STOP.`, en: `To'Latino · El Compa, the AI assistant. How it works: ${u} To stop, reply STOP.` }),
  limite: (u: string): Bi => ({ es: `Llegaste al límite de mensajes de hoy por aquí. Sigue en To'Latino: ${u}`, en: `You reached today's message limit here. Continue on To'Latino: ${u}` }),
  media: { es: "Por aquí solo leo texto. Escríbeme con palabras.", en: "I can only read text here. Write it in words." },
  enlace: (m: number, u: string): Bi => ({ es: `Para confirmarlo, abre este enlace y entra con tu cuenta (un solo uso, vence en ${m} min): ${u}`,
    en: `To confirm it, open this link and sign in with your account (one use, expires in ${m} min): ${u}` }),
  abrir: (m: number, u: string): Bi => ({ es: `Ábrelo aquí y entra con tu cuenta (un solo uso, vence en ${m} min): ${u}`, en: `Open it here and sign in with your account (one use, expires in ${m} min): ${u}` }),
  mas: (u: string): Bi => ({ es: `Más: ${u}`, en: `More: ${u}` }),
  caso: (c: string, u: string): Bi => ({ es: `Tu caso ${c}: ${u}`, en: `Your case ${c}: ${u}` }),
  aviso: { es: "No compartas eso aquí. Nunca te lo pedimos.", en: "Don't share that here. We never ask for it." },
} as const;

/* Palabras clave de una sola palabra (CTIA y TCPA): STOP siempre se respeta, al instante. «YES / SÍ» solo vuelve si estaba de baja. */
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const PARAR = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT", "ALTO", "PARAR", "BAJA"]);
const VOLVER = new Set(["START", "UNSTOP", "ALTA"]), SI = new Set(["YES", "SI"]);
const AYUDA = new Set(["HELP", "INFO", "AYUDA"]);
export function palabraClave(texto: string, media: boolean): "text" | "stop" | "start" | "help" | "media" {
  const w = sinAcentos(String(texto ?? "")).toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (PARAR.has(w)) return "stop";
  if (VOLVER.has(w)) return "start";
  if (AYUDA.has(w)) return "help";
  if (!String(texto ?? "").trim()) return media ? "media" : "text";
  return "text";
}

/* El texto que sale por un canal: plano, sin marcas ni emoji, corto (SMS ≤ 480; WhatsApp ≤ 1000). */
export function plano(t: string, canal: Canal): string {
  // Las marcas se quitan del texto, nunca de un enlace (el token del enlace lleva «_» y «-»).
  const x = String(t ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").split(/(https?:\/\/\S+)/)
    .map((p, i) => (i % 2 ? p : p.replace(/[*_`#>|~]/g, "").replace(/\p{Extended_Pictographic}/gu, ""))).join("").replace(/\s+/g, " ").trim();
  const max = canal === "sms" ? 480 : 1000;
  return x.length > max ? `${x.slice(0, max - 1).trimEnd()}…` : x;
}

type Numero = { id: string; channel: Canal; provider: "telnyx" | "whatsapp" | "sim"; address: string; business_id: string | null; city_id: string };
async function numeroDe(para: string, canal: Canal, proveedor: string): Promise<Numero | null> {
  return (await db().query<Numero>(
    `select id::text, channel, provider, address, business_id, city_id from compa_channel_numbers
      where status = 'active' and address = $1 and channel = $2 and (provider = $3 or $3 = 'sim') order by id limit 1`, [para, canal, proveedor])).rows[0] ?? null;
}

/* 1 · Recibir: una vez por (proveedor, id). Devuelve el id de la entrada y si es nueva (una repetida no se vuelve a procesar ni contestar). */
export async function recibir(e: Entrante): Promise<{ id: string; nuevo: boolean }> {
  const tel = normalizarTelefono(e.de) ?? `+${String(e.de).replace(/\D/g, "").slice(0, 15)}`;
  const n = await numeroDe(String(e.para), e.canal, e.proveedor);
  const kind = palabraClave(e.texto, e.media);
  const body = e.texto.trim() ? tapar(e.texto.slice(0, 2000)).texto : null;
  const r = (await db().query<{ id: string }>(
    `insert into compa_inbound (provider, channel, provider_msg_id, signature_ok, from_hash, from_enc, to_number, number_id, business_id, city_id, kind, body, provider_at)
     values ($1, $2, $3, true, $4, $5, $6, $7::bigint, $8, $9, $10, $11, $12) on conflict (provider, provider_msg_id) do nothing returning id::text`,
    [e.proveedor, e.canal, e.id, huella(tel), cifrar(tel).toString("base64"), String(e.para).slice(0, 40), n?.id ?? null, n?.business_id ?? null, n?.city_id ?? "hzl", kind, body, e.hora])).rows[0];
  if (r) return { id: r.id, nuevo: true };
  const ya = (await db().query<{ id: string }>(`select id::text from compa_inbound where provider = $1 and provider_msg_id = $2`, [e.proveedor, e.id])).rows[0];
  return { id: ya?.id ?? "0", nuevo: false };
}

/* Lo rechazado no se guarda: solo se cuenta (día, proveedor, motivo). Nunca lanza. */
export async function contarRechazo(proveedor: string, motivo: "firma" | "hora" | "tamano" | "formato" | "sin_secreto"): Promise<void> {
  const p = proveedor === "telnyx" || proveedor === "whatsapp" ? proveedor : "otro";
  await db().query(`insert into compa_canal_rechazos (provider, reason, n) values ($1, $2, 1) on conflict (day, provider, reason) do update set n = compa_canal_rechazos.n + 1`, [p, motivo]).catch(() => undefined);
}

/* 2 · La salida: TODO lo que El Compa manda por un canal pasa por aquí. Decide si sale y lo anota (aunque no salga). */
type Salir = { inboundId: string | null; n: Numero; tel: string; hash: string; userId?: string | null; convId?: number | null; ciudad: string; kind: "respuesta" | "enlace" | "fija" | "baja" | "alta" | "ayuda" | "limite" | "auto" | "soporte";
  texto: string; guardar?: string; respuestaDe?: Date | null };
export async function enviar(o: Salir): Promise<string> {
  const canal = o.n.channel, negocio = o.n.business_id, texto = plano(tapar(o.texto).texto, canal), guardado = plano(tapar(o.guardar ?? o.texto).texto, canal);
  let st: string;
  if (!texto) st = "apagado";
  else if (!(await canalEncendido(canal))) st = "apagado";                                                  // canal apagado (o el candado de producción): nada sale
  else if (o.kind !== "baja" && (await db().query<{ v: boolean }>(`select compa_canal_en_baja($1, $2, $3) as v`, [o.hash, canal, negocio])).rows[0]?.v) st = "baja";
  else if (canal === "whatsapp" && !(await db().query(
    `select 1 from compa_inbound where from_hash = $1 and channel = 'whatsapp' and number_id = $2::bigint and received_at > now() - interval '24 hours' limit 1`, [o.hash, o.n.id])).rowCount) st = "ventana";
  else if (!["baja", "alta", "ayuda"].includes(o.kind) && (await tarde(o))) st = "silencio";
  else if (o.n.provider === "sim" || !hayLlaves(o.n.provider)) st = ENTORNO === "produccion" ? "sin_proveedor" : "simulado";
  else st = "pendiente";
  const id = (await db().query<{ id: string }>(
    `insert into compa_outbound (inbound_id, channel, provider, number_id, to_hash, user_id, conversation_id, business_id, city_id, kind, body, status)
     values ($1::bigint, $2, $3, $4::bigint, $5, $6, $7::bigint, $8, $9, $10, $11, $12) returning id::text`,
    [o.inboundId, canal, o.n.provider, o.n.id, o.hash, o.userId ?? null, o.convId ?? null, negocio, o.ciudad, o.kind, guardado || null, st])).rows[0]!.id;
  // El buzón del simulador (solo fuera de producción, en la memoria del proceso; nunca en la base): el texto TAL CUAL saldría, con el enlace
  // real, para que el Admin (simulador del Super Admin) y las pruebas lo abran. En la base queda lo guardado (sin el token).
  if (st === "simulado" && ENTORNO !== "produccion") {
    const B0 = ((globalThis as unknown as { __canalSim?: { entrada: string | null; texto: string }[] }).__canalSim ??= []);
    B0.push({ entrada: o.inboundId, texto }); if (B0.length > 200) B0.splice(0, B0.length - 200);
  }
  // 9l · Por SMS, EL ÚNICO CAMINO (lib/sms: reintentos y estado de entrega); por WhatsApp, directo (el estado llega por los `statuses` de Meta).
  if (st === "pendiente" && o.n.provider === "telnyx") {
    const s = await enviarSms({ tel: o.tel, texto, origen: { kind: "compa", id }, ciudad: o.ciudad, de: o.n.address });
    const e = s?.estado ?? "fallo", fin = e === "fallo" || e === "vencido" ? "fallo" : e === "sin_proveedor" || e === "pendiente" ? "pendiente" : "enviado";
    await db().query(`update compa_outbound set sms_id = $2::bigint, status = $3, sent_at = case when $3 = 'enviado' then now() else sent_at end,
                             provider_msg_id = (select a.provider_msg_id from sms_attempts a where a.sms_id = $2::bigint and a.accepted order by a.n desc limit 1) where id = $1::bigint`, [id, s?.id ?? null, fin]);
    if (e === "entregado") await db().query(`update compa_outbound set status = 'entregado' where id = $1::bigint and status = 'enviado'`, [id]);
    return e === "entregado" ? "entregado" : fin === "pendiente" ? "pendiente" : fin;
  }
  if (st === "pendiente" && o.n.provider !== "sim") {
    const r = await mandar(o.n.provider, o.n.address, o.tel, texto);
    await db().query(`update compa_outbound set status = $2, provider_msg_id = $3, error = $4, sent_at = now() where id = $1::bigint`, [id, r.ok ? "enviado" : "fallo", r.ok ? r.id : null, r.ok ? null : r.error]);
    return r.ok ? "enviado" : "fallo";
  }
  return st;
}

/* Horas de silencio (las de los avisos: 10 PM – 7 AM de la ciudad; la persona puede apagarlas en Mi cuenta): una respuesta A TIEMPO (dentro de
   compa_canal_respuesta_min del mensaje de la persona) sale a cualquier hora porque contesta lo que preguntó; una tardía (el barrido la
   retomó) espera al día: no sale. */
async function tarde(o: Salir): Promise<boolean> {
  const min = await valor("compa_canal_respuesta_min");
  if (o.respuestaDe && min > 0 && Date.now() - o.respuestaDe.getTime() <= min * 60_000) return false;
  const r = (await db().query<{ silencio: boolean }>(
    `select extract(hour from now() at time zone coalesce((select c.timezone from users u join cities c on c.id = u.home_city_id where u.id = $1::uuid), (select timezone from cities where id = $2), 'America/New_York'))
              not between 7 and 21
            and coalesce((select notif_prefs->>'quiet' from users where id = $1::uuid), 'true') <> 'false' as silencio`, [o.userId ?? null, o.ciudad])).rows[0];
  return !!r?.silencio;
}

/* 3 · Procesar una entrada (after() de la ruta y el barrido). Una corrida a la vez por entrada; hasta 3 intentos. Nunca lanza. */
export async function procesar(id: string): Promise<string> {
  const e = (await db().query<{ id: string; provider: string; channel: Canal; from_hash: string; from_enc: string | null; number_id: string | null; kind: string; body: string | null; received_at: Date; attempts: number }>(
    `update compa_inbound set estado = 'procesando', attempts = attempts + 1
      where id = $1::bigint and (estado = 'recibido' or (estado = 'procesando' and attempts < 3 and received_at < now() - interval '5 minutes'))
      returning id::text, provider, channel, from_hash, from_enc, number_id::text, kind, body, received_at, attempts`, [Number(id) || 0])).rows[0];
  if (!e) return "nada";
  const fin = (r: { result: string; userId?: string | null; conv?: number | null }) => db().query(
    `update compa_inbound set estado = 'hecho', result = $2, user_id = $3::uuid, conversation_id = $4::bigint, processed_at = now() where id = $1::bigint`, [e.id, r.result, r.userId ?? null, r.conv ?? null]);
  try {
    const r = await turnoCanal(e);
    await fin(r);
    return r.result;
  } catch {
    // Sin el error en el registro (podría traer el texto): la entrada queda para el barrido; al tercer intento, «falló».
    if (e.attempts >= 3) await db().query(`update compa_inbound set estado = 'fallo', result = 'error', processed_at = now() where id = $1::bigint`, [e.id]).catch(() => undefined);
    return "error";
  }
}

type Fila = { id: string; provider: string; channel: Canal; from_hash: string; from_enc: string | null; number_id: string | null; kind: string; body: string | null; received_at: Date };
async function turnoCanal(e: Fila): Promise<{ result: string; userId?: string | null; conv?: number | null }> {
  const n = e.number_id ? (await db().query<Numero>(`select id::text, channel, provider, address, business_id, city_id from compa_channel_numbers where id = $1::bigint`, [e.number_id])).rows[0] : null;
  const tel = descifrar(e.from_enc ? Buffer.from(e.from_enc, "base64") : null);
  if (!n || !tel) return { result: "sin_ruta" };
  const via = e.provider === "sim" ? "simulador" : "mensaje", texto = e.body ?? "", canal = n.channel, negocio = n.business_id;
  const lang0: Lang = idiomaDe(texto, "es");
  const base = { inboundId: e.id, n, tel, hash: e.from_hash, ciudad: n.city_id, respuestaDe: e.received_at };
  const enBaja = async () => !!(await db().query<{ v: boolean }>(`select compa_canal_en_baja($1, $2, $3) as v`, [e.from_hash, canal, negocio])).rows[0]?.v;

  // ── STOP / START / HELP: siempre, primero, y quedan anotados (compa_canal_consent) ──
  const k = e.kind === "text" && SI.has(sinAcentos(texto).toUpperCase().replace(/[^A-Z]/g, "")) && (await enBaja()) ? "start" : e.kind;
  if (k === "stop" || k === "start") {
    await db().query(`insert into compa_canal_consent (phone_hash, channel, business_id, action, via, inbound_id) values ($1, $2, $3, $4, $5, $6::bigint)`,
      [e.from_hash, canal, negocio, k, via, e.id]);
    // 9l · UNA sola confirmación de STOP (L1104): la nuestra o la del proveedor (Configuración › Avisos y canales); la baja se anota siempre.
    if (k === "start" || (await valor("canal_stop_propia")) === 1) await enviar({ ...base, kind: k === "stop" ? "baja" : "alta", texto: LINEAS_CANAL[k === "stop" ? "baja" : "alta"][lang0] });
    return { result: k === "stop" ? "baja" : "alta" };
  }
  if (await enBaja()) return { result: "en_baja" };    // de baja: no se contesta nada (salvo START)
  // 9l · El tope GLOBAL de remitentes por minuto (una inundación de números falsos, L1120): pasado el tope, a ese número no se le contesta en ese minuto
  // (ni pasa por El Compa) y el equipo recibe una alerta (una cada 10 minutos). STOP ya se respetó arriba.
  if (await sobreElTope(e.id, e.from_hash)) return { result: "tope_global" };
  if (k === "help") { await enviar({ ...base, kind: "ayuda", texto: LINEAS_CANAL.ayuda(`${BASE()}/ayuda/el-compa-por-whatsapp-y-sms`)[lang0] }); return { result: "ayuda" }; }

  // ── Límite por teléfono al día (todas las entradas de ese teléfono): avisa una vez y calla ──
  const lim = await valor("compa_canal_msgs_dia");
  const hoy = (await db().query<{ n: number }>(`select count(*)::int as n from compa_inbound where from_hash = $1 and received_at > now() - interval '1 day' and id <= $2::bigint`, [e.from_hash, e.id])).rows[0]?.n ?? 0;
  if (hoy > lim) {
    if (hoy === lim + 1) await enviar({ ...base, kind: "limite", texto: LINEAS_CANAL.limite(`${BASE()}/soporte`)[lang0] });
    return { result: "limite" };
  }
  if (e.kind === "media" && !negocio) { await enviar({ ...base, kind: "fija", texto: LINEAS_CANAL.media[lang0] }); return { result: "media" }; }
  return negocio ? turnoNegocio(e, n, tel, texto, lang0) : turnoVecino(e, n, tel, texto, lang0);
}

/* El número de To'Latino: El Compa de los vecinos, solo para una cuenta que lo encendió. */
async function turnoVecino(e: Fila, n: Numero, tel: string, texto: string, lang0: Lang): Promise<{ result: string; userId?: string | null; conv?: number | null }> {
  const canal = n.channel, base = { inboundId: e.id, n, tel, hash: e.from_hash, ciudad: n.city_id, respuestaDe: e.received_at };
  if (!(await canalEncendido(canal)) || !(await disponible({ uso: "neighbor", canal, ciudad: n.city_id })).ok) return { result: "apagado" };
  // La identidad: el teléfono VERIFICADO de UNA cuenta activa que encendió el canal. Si no, la respuesta fija (igual para todos).
  const U = (await db().query<{ id: string; lang: string; ciudad: string | null }>(
    `select id::text, lang, home_city_id as ciudad from users where phone = $1 and phone_verified_at is not null and cuenta_estado(status, status_until) in ('active', 'muted')
        and coalesce(notif_prefs->>'cpa', 'false') = 'true' limit 2`, [tel])).rows;
  if (U.length !== 1) {
    await enviar({ ...base, kind: "fija", texto: LINEAS_CANAL.fija(`${BASE()}/entrar?volver=%2Fcuenta%2Favisos`)[lang0] });
    return { result: "fija" };
  }
  const u = U[0]!, lang: Lang = idiomaDe(texto, u.lang === "en" ? "en" : "es"), es = lang === "es";
  const b2 = { ...base, userId: u.id, ciudad: u.ciudad ?? n.city_id };
  const conv = (await db().query<{ number: string }>(
    `select number from compa_conversations where user_id = $1 and channel = $2 and surface = 'channel' and use = 'neighbor' and closed_at is null order by started_at desc limit 1`, [u.id, canal])).rows[0]?.number ?? null;
  const min = await valor("compa_link_min");
  const r = await turno({ userId: u.id }, { conversacion: conv, texto: texto || "(sin texto)", uso: "neighbor", canal, superficie: "channel", lang, accionMin: min });
  if (!r.ok) {
    if (r.apagado) return { result: "apagado", userId: u.id };
    await enviar({ ...b2, kind: r.limite ? "limite" : "respuesta", texto: r.msg[lang] });
    return { result: r.limite ? "limite" : "respuesta", userId: u.id };
  }
  const convId = (await db().query<{ id: number }>(`select id::int from compa_conversations where number = $1 and user_id = $2`, [r.conversacion, u.id])).rows[0]?.id ?? null;
  const partes: string[] = [];
  // La entrada ya llegó tapada (recibir): si traía algo que se tapó, el aviso va igual.
  if (r.aviso || texto.includes(TAPADO)) partes.push((r.aviso ?? LINEAS_CANAL.aviso)[lang]);
  partes.push(r.texto);
  if (r.fuente) partes.push(LINEAS_CANAL.mas(`${BASE()}${r.fuente.href}`)[lang]);
  if (r.persona) partes.push(LINEAS_CANAL.caso(r.persona.caso, `${BASE()}/soporte?caso=${encodeURIComponent(r.persona.caso)}`)[lang]);
  let enlace: string | null = null;
  if (r.accion && convId) {
    enlace = await crearEnlace({ accion: r.accion.id, userId: u.id, convId, canal, inboundId: e.id });
    partes.push((r.accion.tipo === "cancel_request" ? LINEAS_CANAL.enlace : LINEAS_CANAL.abrir)(min, enlace)[lang]);
  }
  const t = partes.join(es ? " " : " ");
  // Lo que se guarda en la salida no lleva el token del enlace (vive solo en el mensaje).
  await enviar({ ...b2, convId, kind: enlace ? "enlace" : "respuesta", texto: t, guardar: enlace ? t.replace(enlace, `${BASE()}/compa/e/[enlace]`) : t });
  return { result: enlace ? "enlace" : r.persona ? "persona" : "respuesta", userId: u.id, conv: convId };
}

/* El número de un negocio: sus respuestas automáticas (7f) por ese canal, a quien sea, sin datos de ninguna cuenta. */
async function turnoNegocio(e: Fila, n: Numero, tel: string, texto: string, lang0: Lang): Promise<{ result: string; conv?: number | null }> {
  const canal = n.channel, negocio = n.business_id!;
  const b = (await db().query<{ nombre: string; ciudad: string; on: boolean; pro: boolean; cuando: string; canales: string[]; abierto: boolean; hoy: number }>(
    `select b.name as nombre, b.city_id as ciudad, coalesce(s.enabled, false) as on, compa_negocio_pro(b.id) as pro, coalesce(s."when", 'closed') as cuando, coalesce(s.channels, '{app}') as canales,
            coalesce(negocio_abierto(b.id, now() at time zone c.timezone), false) as abierto,
            (select count(*)::int from compa_outbound o where o.business_id = b.id and o.kind = 'auto' and o.created_at > now() - interval '1 day') +
            (select count(*)::int from chat_messages m join chat_threads t on t.id = m.thread_id where t.business_id = b.id and m.compa and m.created_at > now() - interval '1 day') as hoy
       from businesses b join cities c on c.id = b.city_id left join compa_business_settings s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || !b.on || !b.pro || b.cuando !== "closed" || b.abierto || !b.canales.includes(canal)) return { result: "auto_nada" };
  const [d, tope, dia] = await Promise.all([disponible({ uso: "auto_reply", canal, ciudad: b.ciudad, negocio }), alTope(), valor("compa_auto_dia_negocio")]);
  if (!d.ok || !(await canalEncendido(canal))) return { result: "apagado" };
  if (tope || b.hoy >= dia) return { result: tope ? "tope" : "auto_nada" };
  if (e.kind === "media") return { result: "auto_nada" };
  const a = await respuestaAutoCanal({ negocio: { id: negocio, nombre: b.nombre, ciudad: b.ciudad }, canal, contacto: { hash: e.from_hash, enc: cifrar(tel).toString("base64") }, texto, lang: lang0, numero: n.address });
  if (!a) return { result: "auto_nada" };
  await enviar({ inboundId: e.id, n, tel, hash: e.from_hash, ciudad: b.ciudad, convId: a.conversacion, kind: "auto", texto: a.texto, respuestaDe: e.received_at });
  return { result: a.pasar ? "auto_paso" : "auto", conv: a.conversacion };
}

/* El barrido: lo que quedó sin procesar (el proceso se cayó) se retoma; pasada la retención se vacían el texto y el teléfono cifrado. */
export async function barrerCanales(): Promise<{ retomadas: number; purgadas: number }> {
  const L = (await db().query<{ id: string }>(
    `select id::text from compa_inbound where (estado = 'recibido' and received_at < now() - interval '1 minute') or (estado = 'procesando' and attempts < 3 and received_at < now() - interval '5 minutes')
      order by received_at limit 50`)).rows;
  let retomadas = 0;
  for (const x of L) if ((await procesar(x.id)) !== "nada") retomadas++;
  const dias = await valor("compa_canal_retener_dias");
  const a = (await db().query(`update compa_inbound set body = null, from_enc = null, purged_at = now() where purged_at is null and received_at < now() - make_interval(days => $1::int) and estado in ('hecho', 'fallo')`, [dias])).rowCount ?? 0;
  const b = (await db().query(`update compa_outbound set body = null, purged_at = now() where purged_at is null and created_at < now() - make_interval(days => $1::int) and status <> 'pendiente'`, [dias])).rowCount ?? 0;
  return { retomadas, purgadas: a + b };
}

/* 9l · El tope GLOBAL de remitentes por minuto (todos los números, WhatsApp y SMS). El lugar de cada número es el de su primer mensaje en el minuto:
   los que llegan después del tope no se contestan ese minuto. Pasado el tope, una alerta al equipo por cada ventana de 10 minutos (canal_alertas). */
async function sobreElTope(id: string, hash: string): Promise<boolean> {
  const tope = await valor("canal_remitentes_min");
  const r = (await db().query<{ pos: number; n: number }>(
    `with v as (select from_hash, min(id) as primero from compa_inbound where received_at > now() - interval '1 minute' and id <= $2::bigint group by from_hash)
     select (select count(*)::int from v where primero <= coalesce((select primero from v where from_hash = $1), $2::bigint)) as pos, (select count(*)::int from v) as n`, [hash, id])).rows[0];
  if (!r || r.n <= tope) return false;
  const nueva = (await db().query<{ id: string }>(
    `insert into canal_alertas (kind, bucket, n, tope) values ('remitentes', to_timestamp(floor(extract(epoch from now()) / 600) * 600), $1, $2) on conflict (kind, bucket) do nothing returning id::text`,
    [r.n, tope])).rows[0];
  if (nueva) {
    const equipo = (await db().query<{ id: string }>(`select m.user_id::text as id from staff_members m where m.status = 'active' and m.role = 'admin'`).catch(() => ({ rows: [] as { id: string }[] }))).rows;
    if (equipo.length) await (await import("../avisos")).avisarMuchos(equipo.map((u) => u.id), "canal_tope", { es: { n: r.n, tope }, en: { n: r.n, tope } }, { href: "/admin/notificaciones?tab=canales" });
  }
  return r.pos > tope;
}

/* 9l · Soporte contesta por WhatsApp (L1118): si el caso entró por WhatsApp (El Compa lo pasó a una persona) y la persona escribió en las últimas 24 h,
   la respuesta del equipo le llega también ahí (la ventana de servicio de Meta: no se cobra). Fuera de la ventana, solo con la plantilla `tl_soporte`
   APROBADA (un aviso con el enlace al caso, nunca el texto). Configuración › Avisos y canales › «Soporte contesta por WhatsApp». Lo de siempre de la
   salida (canal apagado, STOP, la ventana) lo decide enviar(). Devuelve el estado (o «no» si el caso no entró por WhatsApp). */
export async function responderCasoPorWhatsApp(x: { caseId: string; numero: string; texto: string }): Promise<string> {
  const c = (await db().query<{ uid: string; tel: string; lang: string; ciudad: string; conv: number | null }>(
    `select c.user_id::text as uid, u.phone as tel, coalesce(u.lang, 'es') as lang, c.city_id as ciudad, c.compa_conversation_id::int as conv
       from support_cases c join users u on u.id = c.user_id join compa_conversations k on k.id = c.compa_conversation_id
      where c.id = $1::bigint and k.channel = 'whatsapp' and u.phone_verified_at is not null and u.status not in ('deleted', 'merged')`, [Number(x.caseId) || 0])).rows[0];
  if (!c) return "no";
  if ((await valor("soporte_whatsapp")) !== 1) return "apagado";
  const hash = huella(c.tel), es = c.lang !== "en";
  const n = (await db().query<Numero>(
    `select n.id::text, n.channel, n.provider, n.address, n.business_id, n.city_id from compa_channel_numbers n
      where n.channel = 'whatsapp' and n.business_id is null and n.status = 'active'
      order by (n.id = (select i.number_id from compa_inbound i where i.from_hash = $1 and i.channel = 'whatsapp' and i.business_id is null order by i.id desc limit 1)) desc nulls last, n.id limit 1`, [hash])).rows[0];
  if (!n) return "sin_numero";
  const href = `${BASE()}/soporte?caso=${encodeURIComponent(x.numero)}`;
  const texto = es ? `To'Latino · Soporte · ${x.numero}: ${x.texto} Míralo aquí: ${href}` : `To'Latino · Support · ${x.numero}: ${x.texto} See it here: ${href}`;
  const st = await enviar({ inboundId: null, n, tel: c.tel, hash, userId: c.uid, convId: c.conv, ciudad: c.ciudad, kind: "soporte", texto, respuestaDe: new Date() });
  if (st !== "ventana") return st;
  // Fuera de las 24 h: la plantilla aprobada por Meta (solo el número del caso y el enlace).
  const t = (await db().query<{ ok: boolean }>(`select status = 'aprobada' as ok from wa_templates where name = 'tl_soporte' and language = $1`, [es ? "es" : "en_US"])).rows[0];
  if (!t?.ok) return "ventana";
  const guardado = es ? `Plantilla tl_soporte · ${x.numero}` : `Template tl_soporte · ${x.numero}`;
  const sim = n.provider === "sim" || !hayLlaves("whatsapp");
  const r = sim ? null : await mandarPlantilla(n.address, c.tel, "tl_soporte", es ? "es" : "en_US", [x.numero, href]);
  const estado = sim ? (ENTORNO === "produccion" ? "sin_proveedor" : "simulado") : r?.ok ? "enviado" : "fallo";
  await db().query(
    `insert into compa_outbound (inbound_id, channel, provider, number_id, to_hash, user_id, conversation_id, business_id, city_id, kind, body, status, provider_msg_id, error, sent_at)
     values (null, 'whatsapp', $1, $2::bigint, $3, $4, $5::bigint, null, $6, 'plantilla', $7, $8, $9, $10, case when $8 = 'enviado' then now() end)`,
    [n.provider, n.id, hash, c.uid, c.conv, c.ciudad, guardado, estado, r?.ok ? r.id : null, r && !r.ok ? r.error : null]);
  return "plantilla";
}

/* ── Super Admin › El Compa › Canales ── */
export type Modo = "simulador" | "real" | "apagado";
export type DatosCanales = {
  modo: { sms: Modo; whatsapp: Modo }; on: { sms: boolean; whatsapp: boolean };
  numeros: { id: string; canal: Canal; proveedor: string; numero: string; negocio: { id: string; nombre: string } | null; ciudad: string; motivo: string; at: string }[];
  cifras: { entradas24: number; rechazadas24: number; respuestas24: number; bajas30: number; enlaces7: number; usados7: number };
  entradas: { id: string; at: string; canal: Canal; proveedor: string; tel: string; cuenta: boolean; destino: string; tipo: string; resultado: string | null; estado: string; cp: string | null; salida: string | null }[];
  sig: string | null; sandbox: boolean;
};
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export async function datosCanales(antes: string | null): Promise<DatosCanales> {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [N, C, E, onS, onW] = await Promise.all([
    db().query<DatosCanales["numeros"][number] & { neg_id: string | null; neg: string | null }>(
      `select n.id::text, n.channel as canal, n.provider as proveedor, n.address as numero, n.business_id as neg_id, b.name as neg, ci.name as ciudad, n.reason as motivo, ${ISO("n.created_at")} as at
         from compa_channel_numbers n join cities ci on ci.id = n.city_id left join businesses b on b.id = n.business_id where n.status = 'active' order by n.business_id nulls first, n.id`),
    db().query<DatosCanales["cifras"]>(
      `select (select count(*)::int from compa_inbound where received_at > now() - interval '1 day') as "entradas24",
              (select coalesce(sum(n), 0)::int from compa_canal_rechazos where day >= ((now() at time zone 'America/New_York')::date - 1)) as "rechazadas24",
              (select count(*)::int from compa_outbound where created_at > now() - interval '1 day' and status in ('enviado', 'simulado')) as "respuestas24",
              (select count(*)::int from compa_canal_consent where action = 'stop' and at > now() - interval '30 days') as "bajas30",
              (select count(*)::int from compa_links where created_at > now() - interval '7 days') as "enlaces7",
              (select count(*)::int from compa_links where created_at > now() - interval '7 days' and used_result = 'confirmed') as "usados7"`),
    // Sin texto ni teléfono: la huella corta (para ver que es el mismo) y si era una cuenta.
    db().query<DatosCanales["entradas"][number]>(
      `select i.id::text, ${ISO("i.received_at")} as at, i.channel as canal, i.provider as proveedor, left(i.from_hash, 6) as tel, i.user_id is not null as cuenta,
              coalesce(b.name, case when i.number_id is null then 'Sin número' else 'To''Latino' end) as destino, i.kind as tipo, i.result as resultado, i.estado, c.number as cp,
              (select o.status from compa_outbound o where o.inbound_id = i.id order by o.id desc limit 1) as salida
         from compa_inbound i left join businesses b on b.id = i.business_id left join compa_conversations c on c.id = i.conversation_id
        where ($1::bigint is null or i.id < $1::bigint) order by i.id desc limit 31`, [cur]),
    canalEncendido("sms"), canalEncendido("whatsapp"),
  ]);
  const modo = (p: "telnyx" | "whatsapp", on: boolean): Modo => (!on ? "apagado" : hayLlaves(p) ? "real" : ENTORNO === "produccion" ? "apagado" : "simulador");
  return {
    modo: { sms: modo("telnyx", onS), whatsapp: modo("whatsapp", onW) }, on: { sms: onS, whatsapp: onW },
    numeros: N.rows.map((x) => ({ ...x, negocio: x.neg_id ? { id: x.neg_id, nombre: x.neg ?? x.neg_id } : null })),
    cifras: C.rows[0]!, entradas: E.rows.slice(0, 30), sig: E.rows.length > 30 ? E.rows[29]!.id : null, sandbox: ENTORNO !== "produccion",
  };
}

type Res = { ok: true; msg: string } | { ok: false; msg: string };
const limpiar = (m: string) => String(m ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
/* Agregar un número que recibe (compa:aprobar; lo revisa la acción). «sim» (de prueba) solo fuera de producción. */
export async function agregarNumero(s: Staff, x: { canal: string; proveedor: string; numero: string; negocio: string }, motivo: string): Promise<Res> {
  const m = limpiar(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  const canal = x.canal === "whatsapp" ? "whatsapp" : x.canal === "sms" ? "sms" : null;
  const prov = x.proveedor === "sim" ? "sim" : canal === "sms" ? "telnyx" : canal === "whatsapp" ? "whatsapp" : null;
  if (!canal || !prov) return { ok: false, msg: "Elige WhatsApp o SMS." };
  if (prov === "sim" && ENTORNO === "produccion") return { ok: false, msg: "Los números de prueba no existen en producción." };
  const num = String(x.numero ?? "").trim(), dir = canal === "sms" || prov === "sim" ? normalizarTelefono(num) : /^\d{6,20}$/.test(num) ? num : null;
  if (!dir) return { ok: false, msg: canal === "sms" || prov === "sim" ? "Escribe un teléfono de EE. UU. (10 dígitos)." : "Escribe el phone_number_id de Meta (solo números)." };
  const negId = String(x.negocio ?? "").trim().toLowerCase().slice(0, 80);
  return tx(async (c): Promise<Res> => {
    const b = negId ? (await c.query<{ id: string; nombre: string; ciudad: string }>(`select id, name as nombre, city_id as ciudad from businesses where (id = $1 or lower(name) = $1) and status = 'active' order by (id = $1) desc limit 1`, [negId])).rows[0] : null;
    if (negId && !b) return { ok: false, msg: "Ese negocio no existe (escribe su id o su nombre exacto)." };
    if ((await c.query(`select 1 from compa_channel_numbers where address = $1 and status = 'active'`, [dir])).rowCount) return { ok: false, msg: "Ese número ya está conectado." };
    const id = (await c.query<{ id: string }>(`insert into compa_channel_numbers (channel, provider, address, business_id, city_id, reason, added_by) values ($1, $2, $3, $4, $5, $6, $7) returning id::text`,
      [canal, prov, dir, b?.id ?? null, b?.ciudad ?? "hzl", m, s.id])).rows[0]!.id;
    await auditar(c, { actor: s.id, action: "compa.numero", targetKind: "compa_number", targetId: id, city: b?.ciudad ?? null,
      before: null, after: { [`El Compa · número de ${canal === "whatsapp" ? "WhatsApp" : "SMS"}`]: `${dir} · ${b ? b.nombre : "To'Latino"}${prov === "sim" ? " (de prueba)" : ""}` }, reason: m });
    return { ok: true, msg: `Conectado: ${canal === "whatsapp" ? "WhatsApp" : "SMS"} ${dir} para ${b ? b.nombre : "To'Latino"}.` };
  });
}
export async function retirarNumero(s: Staff, id: string, motivo: string): Promise<Res> {
  const m = limpiar(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  if (!/^\d{1,12}$/.test(String(id ?? ""))) return { ok: false, msg: "Ese número no existe." };
  return tx(async (c): Promise<Res> => {
    const n = (await c.query<{ address: string; channel: string; city: string }>(`select address, channel, city_id as city from compa_channel_numbers where id = $1 and status = 'active' for update`, [id])).rows[0];
    if (!n) return { ok: false, msg: "Ese número ya se retiró." };
    await c.query(`update compa_channel_numbers set status = 'retired', retired_at = now(), retired_by = $2, retire_reason = $3 where id = $1`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "compa.numero_retirar", targetKind: "compa_number", targetId: id, city: n.city,
      before: { [`El Compa · número de ${n.channel === "whatsapp" ? "WhatsApp" : "SMS"}`]: n.address }, after: { [`El Compa · número de ${n.channel === "whatsapp" ? "WhatsApp" : "SMS"}`]: "retirado" }, reason: m });
    return { ok: true, msg: "Retirado: ese número ya no recibe." };
  });
}

/* El simulador del sandbox (Super Admin › El Compa › Canales): manda un mensaje COMO un teléfono a uno de los números conectados y devuelve lo
   que El Compa contestó (o por qué no). Nunca en producción; lo usa el Admin (compa:aprobar) y queda en la auditoría sin el teléfono completo. */
export type Simulado = { ok: true; resultado: string; salidas: { tipo: string; estado: string; texto: string | null }[]; cp: string | null } | { ok: false; msg: string };
export async function simular(s: Staff, x: { numero: string; telefono: string; texto: string }): Promise<Simulado> {
  if (ENTORNO === "produccion") return { ok: false, msg: "El simulador no existe en producción." };
  const tel = normalizarTelefono(String(x.telefono ?? "")), t = String(x.texto ?? "").slice(0, 1000);
  if (!tel) return { ok: false, msg: "Escribe un teléfono de EE. UU. (10 dígitos)." };
  if (!t.trim()) return { ok: false, msg: "Escribe el mensaje." };
  const n = (await db().query<Numero>(`select id::text, channel, provider, address, business_id, city_id from compa_channel_numbers where id = $1::bigint and status = 'active'`, [Number(x.numero) || 0])).rows[0];
  if (!n) return { ok: false, msg: "Elige un número conectado." };
  const r = await recibir({ proveedor: "sim", canal: n.channel, id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, de: tel, para: n.address, texto: t, media: false, hora: new Date() });
  await tx((c) => auditar(c, { actor: s.id, action: "compa.simular", targetKind: "compa_number", targetId: n.id, city: n.city_id, before: null,
    after: { "Simulador de El Compa": `${n.channel === "whatsapp" ? "WhatsApp" : "SMS"} desde ···${tel.slice(-4)}` }, reason: "Prueba en el sandbox" }));
  const resultado = await procesar(r.id);
  // Lo simulado se muestra con el texto real (el enlace se puede abrir en el sandbox); lo demás, lo guardado.
  const real = buzonSimulado(r.id);
  const O = (await db().query<{ tipo: string; estado: string; texto: string | null }>(`select kind as tipo, status as estado, body as texto from compa_outbound where inbound_id = $1::bigint order by id`, [r.id])).rows
    .map((x) => (x.estado === "simulado" && real.length ? { ...x, texto: real.shift()! } : x));
  const cp = (await db().query<{ cp: string | null }>(`select c.number as cp from compa_inbound i left join compa_conversations c on c.id = i.conversation_id where i.id = $1::bigint`, [r.id])).rows[0]?.cp ?? null;
  return { ok: true, resultado, salidas: O, cp };
}

/* El buzón del simulador: lo que «salió» (simulado) para una entrada, con el enlace real. Nunca en producción. */
export function buzonSimulado(entrada: string): string[] {
  if (ENTORNO === "produccion") return [];
  return ((globalThis as unknown as { __canalSim?: { entrada: string | null; texto: string }[] }).__canalSim ?? []).filter((x) => x.entrada === entrada).map((x) => x.texto);
}

/* Solo las pruebas (la ruta /api/interno/compa, nunca en producción): la salida a un teléfono por un número, como una respuesta a tiempo. */
export async function enviarPrueba(numeroId: string, telefono: string, texto: string): Promise<string> {
  if (ENTORNO === "produccion") return "no";
  const tel = normalizarTelefono(telefono), n = (await db().query<Numero>(`select id::text, channel, provider, address, business_id, city_id from compa_channel_numbers where id = $1::bigint`, [Number(numeroId) || 0])).rows[0];
  if (!tel || !n) return "no";
  return enviar({ inboundId: null, n, tel, hash: huella(tel), ciudad: n.city_id, kind: "respuesta", texto, respuestaDe: new Date() });
}

/* Panel › El Compa › POR DÓNDE: ¿el negocio tiene un número conectado por cada canal? (sin número, WhatsApp y SMS no se pueden encender). */
export async function numerosDelNegocio(negocio: string): Promise<{ whatsapp: boolean; sms: boolean }> {
  const r = (await db().query<{ channel: Canal }>(`select distinct channel from compa_channel_numbers where business_id = $1 and status = 'active'`, [String(negocio ?? "")])).rows;
  return { whatsapp: r.some((x) => x.channel === "whatsapp"), sms: r.some((x) => x.channel === "sms") };
}
