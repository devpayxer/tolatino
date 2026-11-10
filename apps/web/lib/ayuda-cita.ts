import "server-only";
import { cfgSql } from "./config";
import { COLA_AYUDA_SQL } from "./colas";
import { db, tx } from "./db";
import { devolverPago } from "./cobros";
import { escalarVencidas } from "./ayuda";
import { esEstafa, pausarPorAyuda } from "./ayuda-estafa";

/* Ayuda con la cita (diseño neg-cita-help.js · TLCitaHelp bhelp: APP-NEG-CITA-AYUDA y su -ESTADO). La misma solicitud que
   los pedidos (help_requests, una por operación), con los motivos de Belleza. Regla A7: el negocio responde en 24 h
   (acepta, propone un monto o no puede); si no responde, o la persona no está de acuerdo, To'Latino revisa en 48 h.
   Lo que vuelve a la tarjeta sale del depósito pagado en la app (Stripe); lo pagado en el local se arregla en el local. */
type Bi = { es: string; en: string };
export type MotivoCita = "cobro" | "quien" | "quedo" | "espera" | "dep" | "otro" | "win" | "more" | "bad" | "dmg" | "who" | "tarde" | "igual" | "dano" | "piezas"
  | "seguro" | "noseg" | "interp" | "trato" | "ley" | "nohizo" | "fecha" | "contesta"
  | "peso" | "falto" | "fresco" | "sust" | "caja" | "apa" | "talla" | "cambio"
  | "nollego" | "nocomo" | "inseguro" | "equipaje"
  | "cover" | "lista" | "mesa" | "minimo"
  | "cert" | "horario" | "ensena" | "lic" | "cuidado" | "salir" | "equipo"
  | "idioma" | "ver" | "mudar" | "fotos" | "precio" | "titulo"
  | "doble" | "monto" | "sinbol";
export type RubroAyuda = "belleza" | "auto" | "hogar" | "salud" | "pro" | "merc" | "tienda" | "fiesta" | "trans" | "noche" | "edu" | "ninos" | "dep" | "fe" | "inm" | "dealer" | "evt";
/* A dónde lleva la ayuda de cada operación (cliente) y su detalle en el panel. */
export const hrefAyuda = (numero: string) => (numero.startsWith("M-") ? `/mercado/${numero}/ayuda` : numero.startsWith("A-") ? `/apartado/${numero}/ayuda` : numero.startsWith("F-") ? `/fiesta/${numero}/ayuda` : numero.startsWith("V-") ? `/viaje/${numero}/ayuda` : numero.startsWith("N-") ? `/noche/${numero}/ayuda` : numero.startsWith("I-") ? `/insc/${numero}/ayuda` : numero.startsWith("D-") ? `/vis/${numero}/ayuda` : numero.startsWith("B-") ? `/eventos/orden/${numero}/ayuda` : `/cita/${numero}/ayuda`);
const detPanel = (biz: string, numero: string) => numero.startsWith("B-") ? `/panel/${biz}/eventos` : `/panel/${biz}/hoy?det=${numero.startsWith("M-") ? "merc" : numero.startsWith("A-") ? "apt" : numero.startsWith("F-") ? "fiesta" : numero.startsWith("V-") ? "viaje" : numero.startsWith("N-") ? "noche" : numero.startsWith("I-") ? "insc" : numero.startsWith("D-") ? "vis" : "cita"}:${numero}`;
/* Los motivos de cada rubro (Belleza: bhelp · Auto: ahelp · Hogar: neg-hogar-rev.js RSN). */
export const MOTIVOS: Record<RubroAyuda, MotivoCita[]> = { belleza: ["cobro", "quien", "quedo", "espera", "dep", "otro"], auto: ["cobro", "tarde", "igual", "dano", "piezas", "dep", "otro"], hogar: ["win", "more", "bad", "dmg", "who", "dep", "otro"],
  // Doctores (neg-salud-rev.js RSN) y Profesionales (neg-pro-rev.js RSN): nada se cobra en la app, así que no hay depósito.
  salud: ["cobro", "seguro", "noseg", "interp", "espera", "trato", "otro"], pro: ["cobro", "ley", "nohizo", "fecha", "contesta", "trato", "otro"],
  // Mercados (neg-merc-rev.js RSN) y Tiendas (neg-tienda-rev.js RSN), 4s.
  merc: ["peso", "falto", "fresco", "sust", "caja", "tarde", "otro"], tienda: ["caja", "apa", "talla", "cambio", "dano", "otro"],
  // Fiestas (neg-fiesta-rev.js RSN) y Transporte (neg-trans-rev.js RSN), 4z. «Manejo inseguro» va directo a To'Latino.
  fiesta: ["nollego", "tarde", "nocomo", "falto", "cobro", "dano", "otro"], trans: ["cobro", "tarde", "nollego", "inseguro", "equipaje", "otro"],
  // Noche (neg-noche-rev.js RSN, 4nd) + «No me descontaron el depósito» (Preguntas #6). «Me sentí inseguro» va directo a To'Latino.
  noche: ["cover", "lista", "mesa", "minimo", "inseguro", "trato", "dep", "otro"],
  // Educación, Niños y Deporte (RSNS L24–26, 4ef). «No cuidaron bien a mi niño» va directo a To'Latino (§6 #8).
  edu: ["cobro", "cert", "horario", "ensena", "otro"], ninos: ["cobro", "lic", "horario", "cuidado", "otro"], dep: ["cobro", "salir", "horario", "equipo", "otro"],
  // Iglesias, Bienes Raíces y Autos (RSNS L27–29, 4if). Nada se cobra en la app: «Me pidieron dinero por la ayuda», «Me cobraron por ver» y
  // «Pidieron más para mudarme» van directo a To'Latino («Posible estafa») y lo ofrecido queda en pausa mientras se revisa.
  fe: ["cobro", "idioma", "horario", "trato", "otro"], inm: ["ver", "mudar", "fotos", "nollego", "otro"], dealer: ["precio", "titulo", "fotos", "nollego", "otro"],
  // 6d · Boletos (APP-EVT-AYUDA-PAGO, hueco #3): «Un problema con el pago» lo revisa To'Latino directamente (el cobro es de la plataforma).
  evt: ["doble", "monto", "sinbol", "otro"] };
/* Salud y Pro: las fotos son privadas (factura, recibo) y lo que se pide cambia (corregir el cobro al seguro / terminar). */
export const PRIVADA = (r: RubroAyuda) => r === "salud" || r === "pro" || r === "ninos" || r === "fe" || r === "inm" || r === "dealer";
/* 4if · Iglesias, Bienes Raíces y Autos: en la app no se cobra nada, así que una ayuda de estas NUNCA lleva a una devolución por la app (guardián
   sinDineroEnAyuda): «Que me devuelvan» lo hace el negocio fuera de la app y la persona confirma «Me lo devolvieron». */
export const SIN_DINERO = new Set<RubroAyuda>(["fe", "inm", "dealer"]);
export const QUIERE: Record<RubroAyuda, QuiereCita[]> = { belleza: ["corr", "rev", "avis"], auto: ["corr", "rev", "avis"], hogar: ["corr", "rev", "avis"], salud: ["rev", "seg", "avis"], pro: ["rev", "fin", "avis"], fiesta: ["rev", "desc", "avis"], trans: ["rev", "corr", "avis"], noche: ["rev", "avis"], edu: ["rev", "grupo", "avis"], ninos: ["rev", "arreglar", "avis"], dep: ["rev", "baja", "avis"], merc: ["rev", "corr", "avis"], tienda: ["rev", "corr", "avis"],
  fe: ["rev", "llamar", "avis"], inm: ["rev", "otra", "avis"], dealer: ["rev", "antes", "avis"], evt: ["rev", "avis"] };
/* La URL de una foto de ayuda: las privadas solo por la ruta con permiso, nunca por /medios. */
export const FOTO_AYUDA_SQL = `case when m.private then '/api/ayuda/foto/' || m.id::text else m.url end`;
export const MOTIVOS_CITA: MotivoCita[] = MOTIVOS.belleza;
/* Los que piden foto (diseño: RSN[3] = 1; Hogar: needPh = quedó mal o dañó algo). */
export const CON_FOTO = new Set<MotivoCita>(["cobro", "quedo", "bad", "dmg", "dano", "seguro", "noseg", "peso", "falto", "fresco", "caja", "cambio", "nocomo", "equipaje", "cover", "minimo", "salir", "ver", "mudar", "precio"]);
/* Noche: «No me descontaron el depósito» pide la foto del recibo (Preguntas #6). */
const conFoto = (r: MotivoCita, rubro: RubroAyuda) => CON_FOTO.has(r) || (rubro === "noche" && r === "dep");
/* «Manejo inseguro» (4z): no espera al negocio: va a To'Latino con prioridad. */
export const DIRECTO = new Set<MotivoCita>(["inseguro", "cuidado", "ver", "mudar", "doble", "monto", "sinbol"]);
/* Iglesias (4if): «Me pidieron dinero por la ayuda» (cobro) también va directo; en los demás rubros «cobro» espera al negocio. */
// 6d · Boletos: todo va directo a To'Latino (el cobro de boletos es de la plataforma, no del organizador).
const directo = (r: MotivoCita, rubro: RubroAyuda) => DIRECTO.has(r) || esEstafa(r, rubro) || rubro === "evt";
const rubroDe = (cat: string, numero: string): RubroAyuda => (numero.startsWith("B-") ? "evt" : rubroDeCat(cat));
const rubroDeCat = (cat: string): RubroAyuda => (cat === "NEG-FE" ? "fe" : cat === "NEG-INMUEBLE" ? "inm" : cat === "NEG-DEALER" ? "dealer" : cat === "NEG-EDU" ? "edu" : cat === "NEG-NINOS" ? "ninos" : cat === "NEG-DEPORTE" ? "dep" : cat === "NEG-NOCHE" ? "noche" : cat === "NEG-FIESTA" ? "fiesta" : cat === "NEG-TRANS" ? "trans" : cat === "NEG-AUTO" ? "auto" : cat === "NEG-HOGAR" ? "hogar" : cat === "NEG-SALUD" ? "salud" : cat === "NEG-PRO" ? "pro" : cat === "NEG-MERC" ? "merc" : cat === "NEG-TIENDA" ? "tienda" : "belleza");
/* Si la cita no se dio (cancelada, vencida o no llegó), solo cabe el depósito u otra cosa. */
export const SIN_CITA = new Set<MotivoCita>(["dep", "otro"]);
export type QuiereCita = "corr" | "rev" | "avis" | "seg" | "fin" | "desc" | "grupo" | "arreglar" | "baja" | "llamar" | "otra" | "antes";
const Q2W: Record<QuiereCita, "reponer" | "devolver" | "avisar" | "seguro" | "terminar" | "descuento" | "otro_grupo" | "arreglar" | "cancelar_membresia" | "llamar" | "otra_visita" | "arreglar_antes"> = { corr: "reponer", rev: "devolver", avis: "avisar", seg: "seguro", fin: "terminar", desc: "descuento", grupo: "otro_grupo", arreglar: "arreglar", baja: "cancelar_membresia", llamar: "llamar", otra: "otra_visita", antes: "arreglar_antes" };
export const W2Q: Record<string, QuiereCita> = { reponer: "corr", devolver: "rev", avisar: "avis", seguro: "seg", terminar: "fin", descuento: "desc", otro_grupo: "grupo", arreglar: "arreglar", cancelar_membresia: "baja", llamar: "llamar", otra_visita: "otra", arreglar_antes: "antes" };
export type ResC = { ok: true; numero?: string; mensaje?: Bi } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResC => ({ ok: false, msg: { es, en } });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const money = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/* 4if · Una visita o prueba de manejo «pasó» para la ayuda cuando el negocio marcó Pasó (o No vino: la persona puede decir que no llegaron) o
   cuando, confirmada, ya llegó su hora: lo de «me cobraron por ver» pasa en la puerta, antes de que nadie marque nada. */
const VIS_PASO = `(o.kind = 'visit' and (o.status = 'done' or (o.status = 'confirmed' and o.scheduled_at <= now() + interval '15 minutes')))`;
/* 6d · Una orden de boletos B-… pagada en la app admite ayuda con el pago desde que se paga hasta 7 días después de la fecha (o de la
   cancelación). Las cortesías (sin cobro) no. */
const BOL_PAGADA = `(o.kind = 'tickets' and o.pay_mode = 'app' and o.status = 'confirmed')`;
const BOL_RECIENTE = `(o.kind = 'tickets' and coalesce((select d.ends_at from event_dates d where d.id = (o.details->>'event_date_id')::bigint), o.sent_at) > now() - interval '7 days')`;
const NUM = /^[CMAFVNIDB]-\d{1,10}$/;  // 6d · B-… = orden de boletos  // cita C-…, pedido del mercado M-… (4s), apartado A-… (4s), visita o prueba D-… (4if)

export type AyudaCita = {
  id: string; number: string; reason: MotivoCita; wants: QuiereCita; body: string; amount: number | null; status: "open" | "answered" | "escalated" | "resolved";
  decision: "ok" | "alt" | "no" | null; offer: number | null; reply: string | null; replyAt: string | null; resolution: string | null; resolvedAt: string | null;
  refunded: number; closedBy: "user" | "admin" | null; porUsuario: boolean; at: string; vence: string; fotos: string[];
  // 4if · Sin dinero en la app: «Me lo devolvieron» (pending · confirmed · denied) y si lo ofrecido quedó en pausa por una posible estafa.
  fuera: "pending" | "confirmed" | "denied" | null; pausa: "on" | "off" | null; directa: boolean;
};
const COLS = `h.id::text, h.number, h.reason, h.wants, coalesce(h.body, '') as body, h.amount_cents as amount, h.status, h.decision, h.offer_cents as offer, h.reply, ${ISO("h.reply_at")} as "replyAt",
  h.resolution, ${ISO("h.resolved_at")} as "resolvedAt", h.refunded_cents as refunded, h.closed_by as "closedBy", coalesce(h.escalated_by = 'user', false) as "porUsuario",
  ${ISO("h.created_at")} as at, ${ISO(`h.created_at + make_interval(hours => ${cfgSql("ayuda_negocio_h")})`)} as vence, h.outside_refund as fuera,
  case when h.paused_at is null then null when h.unpaused_at is null then 'on' else 'off' end as pausa, coalesce(h.escalated_by = 'system' and h.reply_at is null, false) as directa,
  array(select ${FOTO_AYUDA_SQL} from media m where m.owner_kind = 'help' and m.owner_id = h.id::text and m.status = 'visible' order by m.sort) as fotos`;
const fila = (x: Omit<AyudaCita, "wants"> & { wants: string }): AyudaCita => ({ ...x, wants: W2Q[x.wants] ?? "avis" });

/* Lo que se puede devolver a la tarjeta: el depósito cobrado en la app, menos lo ya devuelto. */
async function depositoDe(opId: string) {
  // El cobro con más por devolver (Belleza: el depósito; Auto y Hogar: también estimado, «algo más» y visita).
  return (await db().query<{ id: string; amount: number; refunded: number; status: string; brand: string | null; l4: string | null }>(
    `select id::text, amount_cents as amount, refunded_cents as refunded, status, card_brand as brand, card_last4 as l4 from payments
      where operation_id = $1::bigint and kind in ('deposit', 'estimate', 'extra', 'visit', 'full', 'balance')
      order by (status in ('captured', 'partially_refunded')) desc, amount_cents - refunded_cents desc, id desc limit 1`, [opId])).rows[0] ?? null;
}
const devolvible = (p: Awaited<ReturnType<typeof depositoDe>>) => (p && ["captured", "partially_refunded"].includes(p.status) ? p.amount - p.refunded : 0);
const tarjetaL = (p: { brand: string | null; l4: string | null } | null) => (p?.l4 ? `${({ visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" } as Record<string, string>)[p.brand ?? ""] ?? "Tarjeta"} ·· ${p.l4}` : null);

/* ── La persona ── */
export type CitaAyudaVista = { rubro: RubroAyuda; puede: boolean; hecho: boolean; motivo: string | null; a: AyudaCita | null; depPagado: number; devolvible: number; tarjeta: string | null };
export async function ayudaDeCita(userId: string, numero: string): Promise<CitaAyudaVista | null> {
  if (!NUM.test(numero)) return null;
  await escalarVencidas();
  const o = (await db().query<{ id: string; status: string; reciente: boolean; cat: string }>(
    `select o.id::text, case when ${BOL_PAGADA} then 'done' when o.kind = 'tickets' then 'aun' when ${VIS_PASO} then 'done' when o.status_detail = 'noshow' then 'noshow' when o.status_detail = 'hired' and b.category_id = 'NEG-PRO' then 'done'
                             when o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail in ('started', 'cancel_req') then 'done' else o.status end as status,
            case when o.kind = 'tickets' then ${BOL_RECIENTE} else coalesce(o.done_at, o.updated_at) > now() - interval '7 days' or (o.status_detail = 'hired' and b.category_id = 'NEG-PRO')
              or (o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail in ('started', 'cancel_req')) end as reciente, b.category_id as cat
       from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.user_id = $2 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets')`, [numero, userId])).rows[0];
  if (!o) return null;
  const a = (await db().query<Parameters<typeof fila>[0]>(`select ${COLS} from help_requests h where h.operation_id = $1::bigint and h.user_id = $2`, [o.id, userId])).rows[0];
  const rubro = rubroDe(o.cat, numero);
  // 4if · Iglesias, Bienes Raíces y Autos: nada se cobró en la app (no se busca un pago que devolver).
  const p = SIN_DINERO.has(rubro) ? null : await depositoDe(o.id), hecho = o.status === "done";
  const conDep = !!p && p.status !== "failed";
  // Terminada: hasta 7 días. Sin darse: solo si hubo depósito (para reclamarlo), también hasta 7 días.
  const motivo = !o.reciente ? "tarde" : hecho ? null : ["cancelled", "expired", "declined", "noshow"].includes(o.status) && conDep ? null : "aun";
  // Salud y Pro no tienen depósito: si no se dio la cita, no hay nada que reclamar aquí.
  const motivo2 = (PRIVADA(rubro) || SIN_DINERO.has(rubro)) && !hecho && !motivo ? "aun" : motivo;
  return { rubro, puede: !motivo2 && !a, hecho, motivo, a: a ? fila(a) : null, depPagado: p && ["captured", "partially_refunded", "refunded"].includes(p.status) ? p.amount : 0, devolvible: devolvible(p), tarjeta: tarjetaL(p) };
}

export type AyudaCitaIn = { reason: string; wants?: string; body?: string; amount?: string | number | null; fotos?: string[] };
export async function pedirAyudaCita(userId: string, numero: string, p: AyudaCitaIn): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const reason = String(p?.reason ?? "") as MotivoCita;
  // «Que me lo repongan / Cambiarlo» solo cabe si algo faltó, no estaba fresco, la talla o el cambio.
  const cat = (await db().query<{ cat: string }>(`select b.category_id as cat from operations o join businesses b on b.id = o.business_id where o.number = $1`, [numero])).rows[0]?.cat ?? "";
  const rubro = rubroDe(cat, numero);
  if (!MOTIVOS[rubro].includes(reason)) return no("Elige qué pasó.", "Pick what happened.");
  const body = String(p?.body ?? "").trim().slice(0, 500);
  if (body.length < 15) return no("Cuéntanos qué pasó (15 letras o más).", "Tell us what happened (15+ characters).");
  const q = (QUIERE[rubro].includes(String(p?.wants) as QuiereCita) ? String(p.wants) : QUIERE[rubro][0]) as QuiereCita;
  const cents = p?.amount == null || p.amount === "" ? null : Math.round((parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0) * 100);
  if (cents !== null && !(cents > 0 && cents <= 1000000)) return no("Escribe el monto en dólares.", "Write the amount in dollars.");
  const fotos = Array.isArray(p?.fotos) ? [...new Set(p.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (fotos.length > 4) return no("Hasta 4 fotos.", "Up to 4 photos.");
  if (conFoto(reason, rubro) && !fotos.length) return no(rubro === "noche" ? "Agrega la foto del recibo o de la pantalla con el cover publicado." : "Agrega una foto.", rubro === "noche" ? "Add a photo of the receipt or of the screen with the posted cover." : "Add a photo.");
  let pausado: string | null = null, hnum = "";
  const r = await tx(async (c): Promise<ResC> => {
    const o = (await c.query<{ id: string; business_id: string; city_id: string; status: string; ok: boolean; dep: boolean }>(
      `select o.id::text, o.business_id, o.city_id, case when ${BOL_PAGADA} then 'done' when o.kind = 'tickets' then 'aun' when ${VIS_PASO} then 'done' when o.status_detail = 'noshow' then 'noshow' when o.status_detail = 'hired' and o.details->>'rubro' = 'pro' then 'done'
                   when o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail in ('started', 'cancel_req') then 'done' else o.status end as status,
              case when o.kind = 'tickets' then ${BOL_RECIENTE} else coalesce(o.done_at, o.updated_at) > now() - interval '7 days' or (o.status_detail = 'hired' and o.details->>'rubro' = 'pro')
                or (o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail in ('started', 'cancel_req')) end as ok,
              exists (select 1 from payments p where p.operation_id = o.id and (p.kind = 'deposit' or (p.kind = 'full' and o.kind in ('trip', 'tickets'))) and p.status <> 'failed') as dep
         from operations o where o.number = $1 and o.user_id = $2 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets') for update`, [numero, userId])).rows[0];
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (!o.ok) return no(rubro === "evt" ? "La ayuda con una orden de boletos se pide hasta 7 días después del evento." : "La ayuda con una cita se pide hasta 7 días después.", rubro === "evt" ? "Help with a ticket order can be asked up to 7 days after the event." : "Booking help can be asked up to 7 days after.");
    const dada = o.status === "done", sinDar = ["cancelled", "expired", "declined", "noshow"].includes(o.status) && o.dep;
    if (!dada && !sinDar) return no("La ayuda se pide cuando la cita ya pasó.", "Help can be asked once the booking is over.");
    if (!dada && !SIN_CITA.has(reason)) return no("Esta cita no se dio: solo puedes preguntar por el depósito u otra cosa.", "This booking did not happen: you can only ask about the deposit or something else.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from help_requests where user_id = $1 and created_at > now() - interval '1 day'`, [userId])).rows[0]!.n;
    // Un reporte de seguridad («Manejo inseguro») nunca se frena por el límite del día.
    if (n >= 5 && !directo(reason, rubro)) return no("Abriste muchas solicitudes hoy. Prueba mañana.", "You opened many requests today. Try tomorrow.");
    const h = (await c.query<{ id: string; number: string }>(
      `insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, body, amount_cents)
       values ('H-' || nextval('help_request_number_seq'), $1, $2, $3, $4, $5, $6, $7, $8) on conflict (operation_id) do nothing returning id::text, number`,
      [o.id, o.business_id, o.city_id, userId, reason, Q2W[q], body, cents])).rows[0];
    if (!h) return no("Ya tienes una solicitud para esta cita.", "You already have a request for this booking.");
    hnum = h.number;
    // 4ne: «No respetaron la mesa / la lista» cuenta para la cola «Mesas no respetadas».
    if (rubro === "noche" && (reason === "mesa" || reason === "lista")) await (await import("./noche-vigilar")).vigilarNoche(c, o.business_id, "mesa");
    if (directo(reason, rubro)) {
      await c.query(`update help_requests set status = 'escalated', escalated_at = now(), escalated_by = 'system', updated_at = now() where id = $1::bigint`, [h.id]);
      await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select ${COLA_AYUDA_SQL}, 'help_request', $1, $2, $3, 'alta' on conflict do nothing`, [h.id, o.business_id, o.city_id]);
      // 4if · Posible estafa: lo ofrecido (la propiedad, el carro o «Pedir fecha») queda en pausa mientras To'Latino revisa.
      if (esEstafa(reason, rubro)) pausado = await pausarPorAyuda(c, { id: h.id, number: h.number, business_id: o.business_id, city_id: o.city_id, user_id: userId }, { kind: "user", id: userId });
    }
    if (fotos.length) {
      // Salud y Pro: solo fotos privadas (una pública con una factura médica no entra).
      const ok = await c.query(`update media set owner_kind = 'help', owner_id = $1, sort = array_position($3::uuid[], id)
                                 where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible' and ($4::boolean = false or private)`, [h.id, userId, fotos, PRIVADA(rubro)]);
      if (ok.rowCount !== fotos.length) throw new FotoPerdida();
    }
    return { ok: true, numero: h.number };
  }).catch((e) => { if (e instanceof FotoPerdida) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); throw e; });
  if (r.ok) {
    // 6d · Boletos: el pago es de To'Latino; el organizador lo ve en su panel (sin aviso: no tiene que hacer nada).
    if (rubro !== "evt") await avisarAyudaCita(numero, "biz_help_cita");
    if (directo(reason, rubro)) {
      const { avisar, avisarNegocio } = await import("./avisos");
      await avisar(userId, "help_directo", { num: hnum }, { href: hrefAyuda(numero), ref: ["help", hnum] });
      const biz = (await db().query<{ biz: string }>(`select business_id as biz from operations where number = $1`, [numero])).rows[0]?.biz;
      if (pausado != null && biz) await avisarNegocio(biz, "biz_help_pausa", { item: `«${pausado}»`, num: hnum }, { href: detPanel(biz, numero), ref: ["help", hnum] });
    }
    // «No tenían licencia» (Niños) también abre la cola Licencias, como «ley» de Profesionales.
    if (reason === "ley" || reason === "lic") await marcarLicencia(numero).catch(() => undefined);
  }
  return r;
}
class FotoPerdida extends Error {}

/* La persona responde a lo que dijo el negocio: «Entendido» (aceptó), aceptar la propuesta (se devuelve lo propuesto)
   o pedir que To'Latino revise (no pudo, o no le sirve la propuesta).
   4if · Sin dinero en la app (Iglesias, Bienes Raíces, Autos): si el negocio aceptó devolver (o la persona acepta lo que propone), lo devuelve
   el negocio FUERA de la app y la persona confirma «Me lo devolvieron» (devuelto) o dice que no (nodevuelto → To'Latino decide). Nunca
   pasa por devolverPago: no hay nada cobrado en la app que devolver. */
export type AccionAyuda = "entendido" | "aceptar" | "revisar" | "devuelto" | "nodevuelto";
export async function citaAyudaCliente(userId: string, numero: string, accion: AccionAyuda, clave: string): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const h = (await db().query<{ id: string; op: string; status: string; decision: string | null; offer: number | null; reply_by: string | null; business_id: string; city_id: string; cat: string; wants: string; fuera: string | null }>(
    `select h.id::text, h.operation_id::text as op, h.status, h.decision, h.offer_cents as offer, h.reply_by::text, h.business_id, h.city_id, b.category_id as cat, h.wants, h.outside_refund as fuera
       from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
      where o.number = $1 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets') and h.user_id = $2`, [numero, userId])).rows[0];
  if (!h) return no("Esa solicitud no existe.", "That request does not exist.");
  const cambio = () => no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
  const sinDinero = SIN_DINERO.has(rubroDe(h.cat, numero));
  if (h.status !== "answered") return cambio();
  if (accion === "devuelto" || accion === "nodevuelto") {
    if (!sinDinero || h.fuera !== "pending") return cambio();
    if (accion === "devuelto") {
      const r = await db().query(`update help_requests set status = 'resolved', closed_by = 'user', outside_refund = 'confirmed', outside_at = now(), resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered' and outside_refund = 'pending'`, [h.id]);
      if (!r.rowCount) return cambio();
      await avisarAyudaCita(numero, "biz_help_devuelto");
      return { ok: true };
    }
    const ok = await tx(async (c) => {
      const u = await c.query(`update help_requests set status = 'escalated', outside_refund = 'denied', outside_at = now(), escalated_at = now(), escalated_by = 'user', updated_at = now() where id = $1::bigint and status = 'answered' and outside_refund = 'pending'`, [h.id]);
      if (!u.rowCount) return false;
      await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select ${COLA_AYUDA_SQL}, 'help_request', $1, $2, $3, 'alta' on conflict do nothing`, [h.id, h.business_id, h.city_id]);
      return true;
    });
    if (!ok) return cambio();
    await avisarAyudaCita(numero, "biz_help_rev");
    return { ok: true };
  }
  if (accion === "entendido") {
    if (h.decision !== "ok" || h.fuera === "pending") return cambio();
    const r = await db().query(`update help_requests set status = 'resolved', closed_by = 'user', resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
    return r.rowCount ? { ok: true } : cambio();
  }
  if (accion === "aceptar") {
    if (h.decision !== "alt") return cambio();
    if (!/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return no("Prueba de nuevo.", "Try again.");
    if (sinDinero) {
      // Acepta lo que propone el negocio: si es dinero, lo devuelve el negocio fuera de la app y la persona luego confirma «Me lo devolvieron».
      const fuera = h.offer && h.offer > 0;
      const r = await db().query(fuera ? `update help_requests set outside_refund = 'pending', updated_at = now() where id = $1::bigint and status = 'answered' and outside_refund is null`
        : `update help_requests set status = 'resolved', closed_by = 'user', resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
      return r.rowCount ? { ok: true, mensaje: fuera ? { es: `Listo. ${money(h.offer!)} te lo devuelve el negocio directamente; cuando lo tengas, confirma «Me lo devolvieron».`, en: `Done. The business refunds you ${money(h.offer!)} directly; once you have it, confirm «They refunded me».` } : undefined } : cambio();
    }
    let devuelto = 0;
    const p = SIN_DINERO.has(rubroDe(h.cat, numero)) ? null : await depositoDe(h.op), maxi = devolvible(p);
    if (h.offer && h.offer > 0 && p && maxi > 0) {
      const n = Math.min(h.offer, maxi);
      const d = await devolverPago({ paymentId: p.id, centavos: n, por: "business", actorId: h.reply_by, motivo: "Ayuda con la cita: propuesta aceptada", idem: `ayc-${h.id}` });
      if (!d.ok) return { ok: false, msg: d.msg };
      devuelto = n;
    }
    const r = await db().query(`update help_requests set status = 'resolved', closed_by = 'user', refunded_cents = refunded_cents + $2, resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id, devuelto]);
    return r.rowCount ? { ok: true, mensaje: devuelto ? { es: `Te devolvemos ${money(devuelto)} a tu tarjeta.`, en: `Refunding ${money(devuelto)} to your card.` } : undefined } : cambio();
  }
  if (h.decision !== "alt" && h.decision !== "no") return cambio();
  const ok = await tx(async (c) => {
    const u = await c.query(`update help_requests set status = 'escalated', escalated_at = now(), escalated_by = 'user', updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
    if (!u.rowCount) return false;
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select ${COLA_AYUDA_SQL}, 'help_request', $1, $2, $3, 'normal' on conflict do nothing`, [h.id, h.business_id, h.city_id]);
    return true;
  });
  if (!ok) return cambio();
  await avisarAyudaCita(numero, "biz_help_rev");
  return { ok: true };
}

/* ── El negocio ── */
export type AyudaCitaPanel = AyudaCita & { devolvible: number; tarjeta: string | null };
export async function ayudaCitaPanel(negocio: string, numero: string): Promise<AyudaCitaPanel | null> {
  if (!NUM.test(numero)) return null;
  await escalarVencidas();
  const r = (await db().query<Parameters<typeof fila>[0] & { op: string; cat: string }>(
    `select ${COLS}, h.operation_id::text as op, b.category_id as cat from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
      where o.number = $1 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets') and h.business_id = $2`, [numero, negocio])).rows[0];
  if (!r) return null;
  const p = SIN_DINERO.has(rubroDe(r.cat, numero)) ? null : await depositoDe(r.op);
  return { ...fila(r), devolvible: devolvible(p), tarjeta: tarjetaL(p) };
}
/* Responder: ok (acepta lo que pide; si pide que le devuelvan y pagó el depósito en la app, se devuelve ya),
   alt (propone un monto; se devuelve cuando la persona acepta) o no (no puede; la persona puede pedir revisión).
   Devolver dinero pide el permiso de Cobros (`pagar`). */
export async function responderAyudaCita(negocio: string, numero: string, x: { decision: string; texto: string; monto?: string | null; clave: string }, actorId: string, pagar: boolean): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const dec = String(x?.decision ?? "");
  if (!["ok", "alt", "no"].includes(dec)) return no("Elige tu respuesta.", "Pick your answer.");
  const t = String(x?.texto ?? "").trim();
  if (t.length < 5) return no("Escribe tu respuesta.", "Write your reply.");
  if (t.length > 500) return no("Máximo 500 letras.", "Up to 500 characters.");
  if (!/^[0-9a-f-]{36}$/.test(String(x?.clave ?? ""))) return no("Prueba de nuevo.", "Try again.");
  const h = (await db().query<{ id: string; op: string; wants: string; amount: number | null; status: string; cat: string }>(
    `select h.id::text, h.operation_id::text as op, h.wants, h.amount_cents as amount, h.status, b.category_id as cat from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
      where o.number = $1 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets') and h.business_id = $2`, [numero, negocio])).rows[0];
  if (!h || h.status !== "open") return no("Esta solicitud ya cambió (pasó a To'Latino o ya respondiste).", "This request already changed (it went to To'Latino or you already replied).");
  // 4if · Sin dinero en la app: nada vuelve a una tarjeta; si acepta devolver, lo devuelve fuera de la app y la persona lo confirma.
  const sinDinero = SIN_DINERO.has(rubroDe(h.cat, numero));
  const p = SIN_DINERO.has(rubroDe(h.cat, numero)) ? null : await depositoDe(h.op), maxi = devolvible(p);
  const pedido = x.monto == null || x.monto === "" ? null : Math.round((parseFloat(String(x.monto).replace(/[^0-9.]/g, "")) || 0) * 100);
  let offer: number | null = null, devolver = 0;
  if (dec === "alt") {
    if (!pedido || pedido <= 0) return no("Escribe cuánto le propones devolver.", "Write how much you propose to refund.");
    if (maxi > 0 && pedido > maxi) return no(`A su tarjeta puedes devolver hasta ${money(maxi)} (el depósito). Lo demás, en el local.`, `You can refund up to ${money(maxi)} to their card (the deposit). The rest, at the shop.`);
    if (maxi > 0 && !pagar) return no("Solo el dueño puede devolver dinero.", "Only the owner can refund money.");
    offer = pedido;
  }
  if (dec === "ok" && h.wants === "devolver" && maxi > 0) {
    if (!pagar) return no("Solo el dueño puede devolver dinero.", "Only the owner can refund money.");
    devolver = Math.min(maxi, pedido ?? h.amount ?? maxi);
    if (devolver <= 0) return no("Escribe cuánto le devuelves.", "Write how much you refund.");
    offer = devolver;
  } else if (dec === "ok" && h.wants === "devolver") offer = pedido ?? h.amount ?? null;
  // Primero se marca respondida (nadie más responde a la vez); luego, si toca, la devolución (idempotente por clave).
  const fuera = sinDinero && dec === "ok" && h.wants === "devolver" ? "pending" : null;
  const u = await db().query(
    `update help_requests set status = 'answered', decision = $3, offer_cents = $4, reply = $5, reply_at = now(), reply_by = $6, outside_refund = $7, updated_at = now()
      where id = $1::bigint and business_id = $2 and status = 'open'`, [h.id, negocio, dec, offer, t, actorId, fuera]);
  if (!u.rowCount) return no("Esta solicitud ya cambió (pasó a To'Latino o ya respondiste).", "This request already changed (it went to To'Latino or you already replied).");
  if (devolver > 0 && p) {
    const d = await devolverPago({ paymentId: p.id, centavos: devolver, por: "business", actorId, motivo: `Ayuda con la cita: ${t.slice(0, 200)}`, idem: `ayb-${x.clave}` });
    if (!d.ok) {
      await db().query(`update help_requests set status = 'open', decision = null, offer_cents = null, reply = null, reply_at = null, reply_by = null, updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
      return { ok: false, msg: d.msg };
    }
    await db().query(`update help_requests set refunded_cents = refunded_cents + $2 where id = $1::bigint`, [h.id, devolver]);
  }
  await avisarAyudaCita(numero, "help_reply");
  if (fuera) return { ok: true, mensaje: { es: "Respondida. Devuélvele lo cobrado directamente (no pasó por la app); cuando lo tenga, lo confirma.", en: "Replied. Refund the charge directly (it did not go through the app); once they have it, they confirm." } };
  return { ok: true, mensaje: devolver ? { es: `Respondida. Le devolvimos ${money(devolver)} a su tarjeta.`, en: `Replied. We refunded ${money(devolver)} to their card.` } : undefined };
}

/* Hoy · «Ayuda con citas»: las que esperan respuesta (24 h). */
export async function ayudasCitasNegocio(negocio: string) {
  await escalarVencidas();
  return (await db().query<{ num: string; quien: string; reason: MotivoCita; vence: string; rub: string | null }>(
    `select o.number as num, coalesce(u.first_name, 'Cliente') as quien, h.reason, coalesce(o.details->>'rubro', case o.kind when 'party' then 'fiesta' when 'trip' then 'trans' when 'night' then 'noche' when 'market_order' then 'merc' when 'hold' then 'tienda' end) as rub, ${ISO("h.created_at + interval '24 hours'")} as vence
       from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id
      where h.business_id = $1 and h.status = 'open' and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets') order by h.created_at limit 10`, [negocio])).rows;
}

/* Avisos de la ayuda con una cita (enlace a su solicitud o al detalle en el panel). */
export async function avisarAyudaCita(numero: string, tpl: "help_reply" | "help_done" | "biz_help_cita" | "biz_help_rev" | "biz_help_devuelto") {
  const { avisar, avisarNegocio } = await import("./avisos");
  const h = (await db().query<{ uid: string; hnum: string; negocio: string; biz: string; cliente: string | null; cat: string }>(
    `select h.user_id::text as uid, h.number as hnum, b.name as negocio, b.id as biz, u.first_name as cliente, b.category_id as cat from help_requests h join operations o on o.id = h.operation_id
       join businesses b on b.id = h.business_id join users u on u.id = h.user_id where o.number = $1 and o.kind in ('appointment', 'market_order', 'hold', 'party', 'trip', 'night', 'enrollment', 'visit', 'tickets')`, [numero])).rows[0];
  if (!h) return;
  // 4if · Iglesias: a la persona, avisos NEUTROS (puede ser consejería: ni el lugar ni el servicio en la pantalla bloqueada).
  if (h.cat === "NEG-FE" && (tpl === "help_reply" || tpl === "help_done")) { await avisar(h.uid, tpl === "help_reply" ? "fe_help_reply" : "fe_help_done", { num: h.hnum }, { href: hrefAyuda(numero), ref: ["help", h.hnum] }); return; }
  if (tpl === "biz_help_cita" && (h.cat === "NEG-FE" || numero.startsWith("D-"))) { await avisarNegocio(h.biz, h.cat === "NEG-FE" ? "biz_fe_help" : "biz_vis_help", { cliente: h.cliente ?? "", num: numero }, { href: detPanel(h.biz, numero), ref: ["help", h.hnum] }); return; }
  if (tpl === "biz_help_devuelto") { await avisarNegocio(h.biz, tpl, { cliente: h.cliente ?? "", num: h.hnum }, { href: detPanel(h.biz, numero), ref: ["help", h.hnum] }); return; }
  // Salud (§3): avisos neutros, sin consultorio ni paciente.
  if (h.cat === "NEG-SALUD") {
    const t = ({ help_reply: "sal_help_reply", help_done: "sal_help_done", biz_help_cita: "biz_sal_help", biz_help_rev: "biz_sal_help_rev" } as const)[tpl];
    const num = tpl === "biz_help_cita" ? numero : h.hnum;
    if (tpl === "biz_help_cita" || tpl === "biz_help_rev") await avisarNegocio(h.biz, t, { num }, { href: detPanel(h.biz, numero), ref: ["help", h.hnum] });
    else await avisar(h.uid, t, { num }, { href: hrefAyuda(numero), ref: ["help", h.hnum] });
    return;
  }
  if (tpl === "biz_help_cita" || tpl === "biz_help_rev") await avisarNegocio(h.biz, tpl, { cliente: h.cliente ?? "", num: tpl === "biz_help_cita" ? numero : h.hnum }, { href: detPanel(h.biz, numero), ref: ["help", h.hnum] });
  else await avisar(h.uid, tpl, { negocio: h.negocio, num: h.hnum }, { href: hrefAyuda(numero), ref: ["help", h.hnum] });
}

/* Pro · «Ofreció algo que no podía hacer por ley»: cada licencia del negocio (y de su equipo) vuelve a la cola Licencias,
   con prioridad alta, para que To'Latino la revise contra el registro (fase4-salud-pro §4m). La solicitud sigue su camino
   normal (24 h el negocio, luego To'Latino). Sin duplicados: una entrada abierta por licencia. */
async function marcarLicencia(numero: string) {
  await db().query(
    `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
     select 'lic', 'license', l.id::text, o.business_id, o.city_id, 'alta' from operations o join licenses l on l.business_id = o.business_id
      where o.number = $1 and l.status in ('valid', 'review')
     on conflict do nothing`, [numero]);
}

/* Las fotos privadas de una ayuda (Salud y Pro) se borran a los días de Configuración (sp_fotos_ayuda_dias) de cerrarse (§3): el archivo sale del
   almacenamiento y la fila queda como borrada (nada se borra de la base; la URL ya no lleva a nada). */
export async function purgarFotosAyuda() {
  const L = (await db().query<{ id: string; url: string }>(
    `select m.id::text, m.url from media m join help_requests h on m.owner_kind = 'help' and h.id::text = m.owner_id
      where m.private and m.status = 'visible' and h.status = 'resolved' and h.resolved_at < now() - make_interval(days => ${cfgSql("sp_fotos_ayuda_dias")}) limit 50`)).rows;
  if (!L.length) return 0;
  const { borrarObjeto, mediosListos } = await import("./medios");
  for (const m of L) {
    if (mediosListos() && m.url.startsWith("privado/")) await borrarObjeto(m.url);
    await db().query(`update media set status = 'removed', removed_reason = 'Borrada a los ' || ${cfgSql("sp_fotos_ayuda_dias")} || ' días (ayuda cerrada)', url = 'privado/borrada', purged_at = now() where id = $1::uuid`, [m.id]);
  }
  return L.length;
}
