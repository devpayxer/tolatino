import "server-only";
import { db } from "./db";
import { MODO_SMS } from "./entorno";
import { canales, destino, encolar, estadoPushSql } from "./push/cola";
import { enviarSms } from "./sms";

/* Avisos (Super Admin secNotif): cada evento deja un aviso en la bandeja de la persona (siempre) y, si la plantilla va por
   SMS, decide si sale: lo crítico siempre; lo demás respeta sus preferencias (users.notif_prefs) y las horas de silencio
   (10 PM – 7 AM de su ciudad). La solicitud nueva al negocio (biz_req) no espera: solo llega mientras el negocio recibe. En el sandbox el SMS queda «en modo pruebas»; en producción sale por Telnyx con la clave del
   entorno (TELNYX_API_KEY, TELNYX_FROM) o queda «sin proveedor». Nunca rompe la acción que lo dispara.
   8c · PUSH PRIMERO (fase8-apps.md §3.3): el mismo aviso va además por push a los teléfonos y navegadores de la persona (lib/push/cola.ts: se
   encola en la misma vuelta, sin red; lo manda el trabajador). Las mismas reglas: lo apagado no va, de noche solo lo crítico (y la solicitud
   al negocio). El SMS sigue el sms_mode de la plantilla: «siempre» (solo el grupo crit, como hoy), «sin_push» (solo si la persona no tiene
   ningún teléfono con avisos para esa plantilla, o el push no llegó: queda «respaldo» y lo suelta smsRespaldo) o «nunca». Guardián smsSoloRespaldo. */
/* AO · Un valor puede venir en los dos idiomas ({ es, en }): sale el de quien lo recibe (la marca «Anfitriona» · «Host» junto al nombre de una voz). */
type Vars = Record<string, string | number | { es: string; en: string }>;
const llenar = (t: string, v: Vars) => t.replace(/\{(\w+)\}/g, (_, k: string) => { const x = v[k]; return x == null ? `{${k}}` : typeof x === "object" ? x.es : String(x); });
const porIdioma = (v: Vars, es: boolean): Vars => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "object" && x ? (es ? x.es || x.en : x.en || x.es) : x]));

/* 9l · El SMS de un aviso sale por EL ÚNICO CAMINO (lib/sms: sms_outbox con reintentos y estado de entrega; guardián smsConReintento). Aquí solo se
   arma el texto («To'Latino: …» y, si la plantilla lo pide, el enlace de seguimiento) y se anota el SMS en su aviso. En el sandbox el aviso sigue
   «en modo pruebas» (el simulador lleva el recorrido en sms_outbox). */
const BASE_URL = () => (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");
const DE_SMS: Record<string, string> = { entregado: "entregado", enviado: "enviado", reintento: "enviado", pendiente: "enviado", fallo: "fallo", vencido: "fallo", sin_proveedor: "sin_proveedor" };
async function salirSms(tabla: "notifications" | "phone_messages", id: string, tel: string, body: string, tpl: string, ciudad: string | null, pruebas: boolean, href?: string | null): Promise<void> {
  const texto = `To'Latino: ${body}${href && /^\/[A-Za-z0-9/_?=&.%-]*$/.test(href) ? ` ${BASE_URL()}${href}` : ""}`;
  const r = await enviarSms({ tel, texto, tpl, origen: { kind: tabla === "notifications" ? "aviso" : "telefono", id }, ciudad });
  // 25 nov (revisión de 90170a1) · Anotar el SMS en su aviso se intenta DOS veces: si falla, el aviso quedaría «pendiente» sin su sms_id (lib/sms solo lo
  // refleja por sms_id) aunque el SMS haya salido. Si fallan las dos, lanza (avisar lo deja en el registro; LAUNCH).
  const anotar = () => pruebas
    // nosemgrep: tolatino-sql-con-texto-interpolado — tabla es «notifications» o «phone_messages»: función privada, las llamadas pasan el nombre fijo
    ? db().query(`update ${tabla} set sms_id = $2::bigint where id = $1::bigint`, [id, r?.id ?? null])
    // nosemgrep: tolatino-sql-con-texto-interpolado — tabla es «notifications» o «phone_messages»: función privada, las llamadas pasan el nombre fijo
    : db().query(`update ${tabla} set sms_id = $2::bigint, sms_status = $3, sms_at = now() where id = $1::bigint`, [id, r?.id ?? null, r ? DE_SMS[r.estado] ?? "fallo" : "fallo"]);
  await anotar().catch(() => anotar());
}

/* 7h · ¿Este teléfono pidió STOP al número de SMS de To'Latino? (compa_canal_consent; la última palabra manda). Ante la duda (la base falla), no se
   manda: mejor un SMS de menos que uno a quien pidió que no. */
async function enBajaSms(tel: string): Promise<boolean> {
  try {
    const { huella } = await import("./cifrado");
    return !!(await db().query<{ v: boolean }>(`select compa_canal_en_baja($1, 'sms', null) as v`, [huella(tel)])).rows[0]?.v;
  } catch { return true; }
}

/* 25 nov (revisión de 621f214) · Dice si el aviso quedó: true si quedó en la campana; undefined si la persona eligió no recibirlo (apagado: no se manda y
   no hay nada que reintentar); false si no se pudo (no hay plantilla o persona, o la base falló). Quien tiene que reintentarlo mira «=== false» (cobros ›
   avisarTardeCobrada); los demás lo ignoran, como siempre. */
/* 25 nov (revisión de ae940a7) · unaVez: la llave de un aviso que se REINTENTA (cobros › barrerCobradasTarde vuelve a pedir el de quien pagó o el del
   negocio si alguno no quedó): la marca <unaVez>:<persona> (notif_once, solo inserción) y la fila del aviso se anotan en la MISMA sentencia; si la marca ya
   estaba, la persona ya lo tiene: no se anota otra fila y dice true (quedó). Así el reintento nunca repite el aviso a quien ya le llegó. Guardián liberarMira. */
export async function avisar(userId: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; sinSms?: boolean; actor?: string | null; unaVez?: string } = {}): Promise<boolean | undefined> {
  try {
    const r = (await db().query<{ grp: string; pref: string | null; sms: boolean; sms_mode: string; push: boolean; enlace: boolean; title: { es: string; en: string }; body: { es: string; en: string }; lang: string; phone: string; prefs: Record<string, boolean>; city: string | null; tz: string; silencio: boolean; pn: number }>(
      `select tp.grp, tp.pref, tp.sms, tp.sms_mode, tp.push, tp.sms_enlace as enlace, tp.title, tp.body, u.lang, u.phone, u.notif_prefs as prefs, u.home_city_id as city, coalesce(c.timezone, 'America/New_York') as tz,
              extract(hour from now() at time zone coalesce(c.timezone, 'America/New_York')) not between 7 and 21 as silencio,
              (select count(*)::int from push_tokens t where ${destino("u.id", "tp.app", "$3::text[]")}) as pn
         from notif_templates tp, users u left join cities c on c.id = u.home_city_id where tp.key = $1 and u.id = $2`, [tpl, userId, await canales()])).rows[0];
    if (!r) return false;
    // 6j · El título también lleva las variables («Tus boletos para {evento}» salía con la llave escrita): guardián avisoTituloLleno.
    v = porIdioma(v, r.lang !== "en"); // AO · los valores en dos idiomas, en el de quien lo recibe
    const es = r.lang !== "en", title = llenar(es ? r.title.es : r.title.en, v).slice(0, 120), body = llenar(es ? r.body.es : r.body.en, v).slice(0, 480);
    const apagado = r.pref ? r.prefs?.[r.pref] === false : false, quiet = r.grp !== "crit" && tpl !== "biz_req" && r.silencio && r.prefs?.quiet !== false;
    // 5i · Grupo Comunidad (Mi cuenta › Avisos): apagado = no llega (no tiene SMS); «Un resumen al día» = se guarda para el resumen
    // (no sale en la campana hasta el resumen de la hora de Configuración; lo arma resumenComunidad en el barrido).
    // 6j · Grupo Eventos: lo que tiene interruptor (Boletos y cambios · Recordatorios · Eventos que guardas) apagado = no llega; lo que no
    // lo tiene (boleto comprado o devuelto, el boleto que te mandan, cancelaciones y cambios de fecha) llega siempre (guardián
    // eventosCriticoSiempreLlega).
    if ((r.grp === "community" || r.grp === "events") && apagado) return;
    const guardado = r.grp === "community" && !!r.pref && r.prefs?.dig === true;
    const st0 = !r.sms ? "no" : apagado || o.sinSms ? "apagado" : quiet ? "silencio" : MODO_SMS === "pruebas" ? "pruebas" : "pendiente";
    // 7h · Un teléfono que respondió STOP al número de To'Latino no recibe más SMS (queda «baja»; el aviso sigue en la campana).
    const st1 = (st0 === "pendiente" || st0 === "pruebas") && (await enBajaSms(r.phone)) ? "baja" : st0;
    // 8c · Push: la plantilla lo lleva (lo de crecimiento solo con «mkt_push» encendido: Apple 4.5.4), no está apagado, no se guarda para el
    // resumen, no es de noche (salvo lo crítico) y la persona tiene un teléfono o navegador con avisos para esta app.
    const pst = !r.push || (r.grp === "mkt" && r.prefs?.mkt_push !== true) || guardado ? "no" : apagado ? "apagado" : quiet ? "silencio" : r.pn > 0 ? "pendiente" : "sin_app";
    // El SMS de una plantilla «sin_push» espera al push (respaldo); «siempre» (solo crit) sale igual; «nunca» ya es «no» (r.sms = false).
    const st = pst === "pendiente" && r.sms_mode === "sin_push" && (st1 === "pendiente" || st1 === "pruebas") ? "respaldo" : st1;
    const llave = o.unaVez ? `${o.unaVez}:${userId}`.slice(0, 200) : null;
    const id = (await db().query<{ id: string }>(
      `with k as (insert into notif_once (key) select $14::text where $14::text is not null on conflict do nothing returning 1)
       insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, sms_to, actor_user_id, held_digest, push_status)
       select $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text, $10::text, $11::uuid, $12::boolean, $13::text where $14::text is null or exists (select 1 from k) returning id::text`,
      [userId, r.city, tpl, title, body, o.href ?? null, o.ref?.[0] ?? null, o.ref?.[1] ?? null, st, r.sms ? r.phone : null, o.actor ?? null, guardado, pst, llave])).rows[0]?.id;
    if (!id) return true; // unaVez: la persona ya lo tenía (la marca estaba)
    // 25 nov (revisión de efe56b9) · La fila ya quedó en la campana: el aviso QUEDÓ. Lo que falle después (encolar el push, el SMS) va al registro, nunca a
    // «no quedó»: quien reintenta lo que no quedó (cobros › barrerCobradasTarde) repetiría el aviso que la persona ya tiene. Guardián liberarMira.
    // 25 nov (revisión de ae940a7) · enviarSms (lib/sms) nunca lanza: lo que no pudo ni anotar en sms_outbox vuelve null y salirSms lo deja «fallo». Lo que
    // lanza aquí es la base DESPUÉS (anotar el SMS en su aviso), cuando el SMS pudo haber salido: el estado no se toca (nunca «fallo» de un SMS que salió);
    // lo que pasó con él está en sms_outbox (origen aviso:<id>).
    try {
      if (pst === "pendiente") await encolar([id]);
    } catch (e) { console.error(`[avisos] ${tpl} ${id}: quedó en la campana, pero el push no se encoló: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
    try {
      if (st === "pendiente" || st === "pruebas") await salirSms("notifications", id, r.phone, body, tpl, r.city, st === "pruebas", r.enlace ? o.href : null);
    } catch (e) {
      console.error(`[avisos] ${tpl} ${id}: quedó en la campana; el SMS se pidió, pero su estado no se anotó en el aviso (míralo en sms_outbox, origen aviso:${id}): ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    }
    return true;
  } catch (e) {
    // Un aviso nunca rompe la acción que lo dispara; pero no se traga en silencio (revisión de ae940a7: un «false» sin rastro costó encontrar por qué).
    console.error(`[avisos] ${tpl}: el aviso a ${userId} no quedó: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    return false;
  }
}

/* 8c · El SMS de respaldo de un aviso cuyo push no llegó (lib/push/cola.ts lo pide cuando ya no hay push que lo lleve, o al vencer push_ttl_h).
   UNA vez: reclama el estado «respaldo» en la misma escritura (dos trabajadores nunca mandan dos SMS). Vuelve a mirar las horas de silencio
   (puede ser horas después) y el STOP. Nunca lanza. */
export async function smsRespaldo(nid: string): Promise<string | null> {
  try {
    const r = (await db().query<{ to: string | null; body: string; st: string; tpl: string; city: string | null; href: string | null; enlace: boolean }>(
      `update notifications n set sms_status = case when tp.grp <> 'crit' and n.tpl <> 'biz_req' and coalesce(u.notif_prefs->>'quiet', '') <> 'false'
                                                     and extract(hour from now() at time zone coalesce(c.timezone, 'America/New_York')) not between 7 and 21 then 'silencio'
                                                     when $2 then 'pruebas' else 'pendiente' end
         from notif_templates tp, users u left join cities c on c.id = u.home_city_id
        where n.id = $1::bigint and n.sms_status = 'respaldo' and tp.key = n.tpl and u.id = n.user_id
        returning n.sms_to as to, n.body, n.sms_status as st, n.tpl, n.city_id as city, n.href, tp.sms_enlace as enlace`, [nid, MODO_SMS === "pruebas"])).rows[0];
    if (!r || (r.st !== "pendiente" && r.st !== "pruebas")) return r?.st ?? null;
    if (!r.to || (await enBajaSms(r.to))) { await db().query(`update notifications set sms_status = 'baja' where id = $1::bigint`, [nid]); return "baja"; }
    await salirSms("notifications", nid, r.to, r.body, r.tpl, r.city, r.st === "pruebas", r.enlace ? r.href : null);
    return (await db().query<{ s: string }>(`select sms_status as s from notifications where id = $1::bigint`, [nid])).rows[0]?.s ?? null;
  } catch { return null; }
}

/* 6d · Un aviso a un TELÉFONO (el boleto que te mandan o una cortesía): si el número ya tiene cuenta, es un aviso normal (bandeja + SMS
   según la plantilla y sus horas de silencio); si todavía no tiene cuenta, solo el SMS, guardado en phone_messages con el teléfono
   cifrado y su huella (nunca en claro). El silencio es el de la ciudad del evento. Nunca rompe la acción que lo dispara. */
export async function avisarTelefono(tel: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; city?: string | null; en?: boolean } = {}): Promise<void> {
  try {
    const u = (await db().query<{ id: string }>(`select id::text from users where phone = $1 and status <> 'deleted' limit 1`, [tel])).rows[0];
    if (u) { await avisar(u.id, tpl, v, o); return; }
    const t = (await db().query<{ grp: string; sms: boolean; body: { es: string; en: string }; silencio: boolean; enlace: boolean }>(
      `select t.grp, t.sms, t.body, t.sms_enlace as enlace, extract(hour from now() at time zone coalesce((select timezone from cities where id = $2), 'America/New_York')) not between 7 and 21 as silencio
         from notif_templates t where t.key = $1`, [tpl, o.city ?? null])).rows[0];
    if (!t?.sms) return;
    const { cifrar, huella } = await import("./cifrado");
    const body = llenar(o.en ? t.body.en : t.body.es, porIdioma(v, !o.en)).slice(0, 480);
    const st0 = t.grp !== "crit" && t.silencio ? "silencio" : MODO_SMS === "pruebas" ? "pruebas" : "pendiente";
    const st = st0 !== "silencio" && (await enBajaSms(tel)) ? "baja" : st0;   // 7h · STOP al número de To'Latino
    const id = (await db().query<{ id: string }>(`insert into phone_messages (phone_enc, phone_hash, city_id, tpl, body, ref_kind, ref_id, sms_status) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id::text`,
      [cifrar(tel), huella(tel), o.city ?? null, tpl, body, o.ref?.[0] ?? null, o.ref?.[1] ?? null, st])).rows[0]!.id;
    if (st === "pendiente" || st === "pruebas") await salirSms("phone_messages", id, tel, body, tpl, o.city ?? null, st === "pruebas", t.enlace ? o.href : null);
  } catch { /* un aviso nunca rompe la acción que lo dispara */ }
}

/* El mismo aviso a muchas personas en una sola escritura (p. ej. el resultado de una encuesta a quienes votaron). Solo plantillas
   sin SMS (las que llevan SMS van una por una con avisar()). Las variables pueden cambiar con el idioma de cada persona. */
export async function avisarMuchos(ids: string[], tpl: string, v: { es: Vars; en: Vars }, o: { href?: string; ref?: [string, string]; actor?: string | null } = {}) {
  const L = [...new Set(ids)].filter(Boolean);
  if (!L.length) return;
  try {
    // Un valor { es, en } dentro de v.es o v.en sale en el idioma de quien lo recibe (v.es para quien lee en español, v.en para quien lee en inglés).
    const ves = porIdioma(v.es, true), ven = porIdioma(v.en, false);
    const t = (await db().query<{ sms: boolean; grp: string; pref: string | null; title: { es: string; en: string }; body: { es: string; en: string } }>(`select sms, grp, pref, title, body from notif_templates where key = $1`, [tpl])).rows[0];
    if (!t) return;
    if (t.sms) {
      // Una por una (con SMS), cada quien con las variables de su idioma. Si el idioma no se puede leer, cae al español (de mil en mil, como la otra vía).
      const en = new Set<string>();
      for (let i = 0; i < L.length; i += 1000) for (const r of (await db().query<{ id: string }>(`select id::text from users where id = any($1::uuid[]) and lang = 'en'`, [L.slice(i, i + 1000)]).catch(() => ({ rows: [] as { id: string }[] }))).rows) en.add(r.id);
      for (const id of L) await avisar(id, tpl, en.has(id) ? ven : ves, o);
      return;
    }
    for (let i = 0; i < L.length; i += 1000) {
      // 5i · Grupo Comunidad: lo apagado no llega; con «Un resumen al día», se guarda para el resumen (como avisar()).
      // 6j · Grupo Eventos: lo apagado no llega (no hay resumen).
      const com = (t.grp === "community" || t.grp === "events") && !!t.pref, dig = t.grp === "community";
      // 8c · El push de cada persona con las mismas reglas que avisar() (estadoPushSql: plantilla, crecimiento, noche, teléfonos); lo que se guarda
      // para el resumen diario no va por push (el resumen sí).
      const ids = (await db().query<{ id: string }>(
        `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, sms_to, actor_user_id, held_digest, push_status)
         select u.id, u.home_city_id, $2, case when u.lang = 'en' then $4 else $3 end, case when u.lang = 'en' then $6 else $5 end, $7, $8, $9, 'no', null, $10::uuid,
                $11 and $13 and coalesce(u.notif_prefs->>'dig', '') = 'true',
                case when $11 and $13 and coalesce(u.notif_prefs->>'dig', '') = 'true' then 'no' else ${estadoPushSql("u", "tp", "coalesce(ci.timezone, 'America/New_York')", "$14::text[]")} end
           from users u join notif_templates tp on tp.key = $2 left join cities ci on ci.id = u.home_city_id
          where u.id = any($1::uuid[]) and not ($11 and coalesce(u.notif_prefs->>$12, '') = 'false')
         returning id::text`,
        [L.slice(i, i + 1000), tpl, llenar(t.title.es, ves).slice(0, 120), llenar(t.title.en, ven).slice(0, 120), llenar(t.body.es, ves).slice(0, 480), llenar(t.body.en, ven).slice(0, 480), o.href ?? null, o.ref?.[0] ?? null, o.ref?.[1] ?? null, o.actor ?? null, com, t.pref ?? "", dig, await canales()])).rows;
      await encolar(ids.map((x) => x.id));
    }
  } catch { /* un aviso nunca rompe la acción que lo dispara */ }
}

/* Los dueños activos de un negocio (para los avisos al negocio). */
/* 25 nov (revisión de 621f214) · Dice si quedó (como avisar): el grupo apagado por el negocio cuenta como quedó; si la lista de dueños no se pudo leer o
   el aviso de alguno no quedó, false. */
/* 25 nov (revisión de efe56b9) · unaVez: la llave de un aviso que se REINTENTA (cobros › barrerCobradasTarde vuelve a pedir el del negocio si alguno no
   quedó): va a cada dueño con avisar(…, { unaVez }), que anota la marca <unaVez>:<dueño> con la fila; el reintento solo le llega a los que faltan.
   Guardián liberarMira. */
export async function avisarNegocio(negocio: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; unaVez?: string } = {}): Promise<boolean> {
  // 9n · Panel › Más › Lo que te avisamos: el negocio apaga un grupo (pedidos, citas, reseñas…); lo que no tiene grupo (dinero, sanciones) siempre llega.
  const apagado = (await db().query(`select 1 from notif_templates t join business_notif_prefs p on p.pref = t.biz_pref and p.business_id = $1 where t.key = $2 and p.off`, [negocio, tpl]).catch(() => ({ rowCount: 0 }))).rowCount;
  if (apagado) return true;
  const q = await db().query<{ id: string }>(`select user_id::text as id from business_members where business_id = $1 and status = 'active' and kind = 'owner'`, [negocio]).catch(() => null);
  if (!q) return false;
  const L = q.rows;
  let todos = true;
  for (const u of L) if ((await avisar(u.id, tpl, v, o)) === false) todos = false;
  return todos;
}

/* 25 nov (revisión de efe56b9; en un solo sitio desde la de ae940a7) · Una parte del aviso de lo que aplicó el barrido (quien pagó o el negocio: viajes ›
   avisarViajeTardeCobrado, evento-privado › avisarEvpTardeCobrado), por su cuenta: dice si quedó y, si tira, va al registro y cuenta como no quedó, sin
   llevarse la otra parte. Guardián liberarMira. */
export async function avisoParte(numero: string, tpl: string, f: () => Promise<boolean | undefined>): Promise<boolean> {
  try { return (await f()) !== false; } catch (e) { console.error(`[cobrada] ${numero}: el aviso ${tpl} no salió: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return false; }
}

/* Atajos por evento: leen lo necesario del pedido, la mesa, la solicitud o la ayuda. */
export async function avisarPedido(numero: string, tpl: "ord_ok" | "ord_no" | "ord_ready" | "ord_way") {
  const o = (await db().query<{ uid: string; negocio: string; hora: string }>(
    `select o.user_id::text as uid, b.name as negocio, to_char(coalesce(o.ready_at, now()) at time zone c.timezone, 'FMHH12:MI AM') as hora
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'order'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return;
  // 9v (sexta tanda) · {dinero} de ord_no (0223): lo que de verdad pasó con la retención de la tarjeta, leído del cobro DESPUÉS de soltarlo (pedidos ›
  // cambiarPaso › soltarRetencion): la que la pasarela no soltó todavía se dice así (el equipo ya tiene la alerta hold_stuck), nunca «No se te cobró nada» a secas.
  // 25 nov (restos de la clase) · Se lee el estado del cobro (no solo «¿hay retención?»): si la consulta falla, un texto que no afirma nada del dinero (antes caía
  // en «No se te cobró nada»); soltada, «no se te cobró nada» con lo que se soltó; cobrado o devuelto (no debería pasar en un pedido que no se aceptó), lo neutro.
  let dinero: Vars[string] = "";
  if (tpl === "ord_no") {
    const q = await db().query<{ st: string; amt: number }>(`select p.status as st, coalesce(nullif(p.held_cents, 0), p.amount_cents) as amt from payments p join operations o on o.id = p.operation_id where o.number = $1 and o.kind = 'order' and p.kind in ('full', 'deposit') order by (p.status = 'held') desc, p.id desc limit 1`, [numero]).then((r) => r.rows, () => null);
    const h = q?.[0], dc = await import("./devolucion-cancelar"), neutro = { es: " Mira en tu pedido lo que pasó con tu pago.", en: " Check your order to see what happened with your payment." };
    dinero = !q ? neutro : !h || h.st === "failed" ? { es: " No se te cobró nada.", en: " You were not charged." } : h.st === "held" ? dc.sinSoltarCliente(h.amt)
      : h.st === "released" ? { es: ` No se te cobró nada: se soltó la retención de ${dc.usdTxt(h.amt)} de tu tarjeta.`, en: ` You were not charged: the ${dc.usdTxt(h.amt)} hold came off your card.` } : neutro;
  }
  await avisar(o.uid, tpl, { negocio: o.negocio, num: numero, hora: o.hora, dinero }, { href: `/pedido/${numero}`, ref: ["order", numero] });
}
/* 9l · «Tu pedido llegó» (L272): solo un pedido con entrega (stage delivered), una vez. Lo llaman el negocio (Hoy) y el repartidor al entregar.
   9n · También el envío del mercado que entrega el repartidor (merc_entregado, con su número M-… y su pantalla). */
export async function avisarEntregado(opId: string) {
  const o = (await db().query<{ uid: string; negocio: string; num: string; merc: boolean }>(
    `select o.user_id::text as uid, b.name as negocio, o.number as num, o.kind = 'market_order' as merc from operations o join businesses b on b.id = o.business_id
      where o.id = $1::bigint and o.kind in ('order', 'market_order') and o.stage = 'delivered'`, [opId]).catch(() => ({ rows: [] }))).rows[0];
  if (!o || !(await db().query(`insert into notif_once (key) values ($1) on conflict do nothing`, [`ord_entregado:${opId}`]).catch(() => ({ rowCount: 0 }))).rowCount) return;
  await avisar(o.uid, o.merc ? "merc_entregado" : "ord_entregado", { negocio: o.negocio, num: o.num }, { href: o.merc ? `/mercado/${o.num}` : `/pedido/${o.num}`, ref: ["order", o.num] });
}
export async function avisarMesa(numero: string, tpl: "rsv_ok" | "rsv_alt" | "rsv_no" | "rsv_chg_ok" | "rsv_chg_no" | "rsv_hoy", alt?: string) {
  const o = (await db().query<{ uid: string; negocio: string; dia: string; dia_en: string; hora: string; sms: boolean }>(
    `select o.user_id::text as uid, b.name as negocio, to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia, to_char(o.scheduled_at at time zone c.timezone, 'FMMM/FMDD') as dia_en, to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora,
            coalesce((o.details->>'sms')::boolean, true) as sms
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'table'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  let a = alt ?? "";
  if (o && tpl === "rsv_alt" && !a) {
    const p = (await db().query<{ at: string | null }>(`select p.proposed->>'at' as at from change_proposals p join operations o on o.id = p.operation_id where o.number = $1 and p.status = 'open' order by p.created_at desc limit 1`, [numero]).catch(() => ({ rows: [] }))).rows[0];
    if (p?.at) { const [h, m] = p.at.split(":").map(Number); a = `${(h! % 12) || 12}:${String(m ?? 0).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`; }
  }
  // 9l · «Avísame por SMS cuando confirmen y el día de la reservación» (Detalles): sin esa marca, el aviso llega a la app y por push, sin SMS.
  if (o) await avisar(o.uid, tpl, { negocio: o.negocio, dia: { es: o.dia, en: o.dia_en }, hora: o.hora, alt: a }, { href: `/reserva/${numero}`, ref: ["table", numero], sinSms: !o.sms });
}

/* 5c · Bloquear es mutuo e invisible también en la bandeja: un aviso que provocó alguien con quien hay un bloqueo (en cualquier
   sentido) deja de verse y de contar, aunque haya llegado antes del bloqueo (guardián bloqueoMutuo). */
const SIN_BLOQUEO_AVISO = `(n.actor_user_id is null or not exists (select 1 from user_blocks ub where ub.removed_at is null and ub.kind = 'block'
  and ((ub.user_id = n.user_id and ub.target_user_id = n.actor_user_id) or (ub.user_id = n.actor_user_id and ub.target_user_id = n.user_id))))`;
/* La bandeja (APP-NOTIF): los avisos de la persona, los nuevos primero sin leer, con cursor. */
export async function misAvisos(userId: string, antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = (await db().query<{ id: string; tpl: string; title: string; body: string; href: string | null; at: string; leido: boolean }>(
    `select id::text, tpl, title, body, href, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, read_at is not null as leido
       from notifications n where n.user_id = $1 and not n.held_digest and ($2::bigint is null or n.id < $2::bigint) and ${SIN_BLOQUEO_AVISO}
      order by n.id desc limit 31`, [userId, cur])).rows;
  return { filas: L.slice(0, 30), sig: L.length > 30 ? L[29]!.id : null };
}
export async function noLeidos(userId: string) {
  return (await db().query<{ n: number }>(`select count(*)::int as n from notifications n where n.user_id = $1 and n.read_at is null and not n.held_digest and ${SIN_BLOQUEO_AVISO}`, [userId])).rows[0]?.n ?? 0;
}
export async function marcarLeidos(userId: string) {
  await db().query(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId]);
}

/* 5i · El resumen diario de la Comunidad (APP-NOTIF «Un resumen al día en vez de cada aviso», Mi cuenta › Avisos › Comunidad): a la hora
   de Configuración (com_resumen_hora, día local de la ciudad de la persona), quien tiene avisos de la Comunidad guardados recibe UNO con
   cuántos de cada cosa. Una vez por persona y día (notif_digests, pk): correrlo otra vez no manda otro. Lo que provocó alguien con quien
   hay un bloqueo (en cualquier sentido) no se cuenta ni se nombra (SIN_BLOQUEO_AVISO). Sin SMS. Lo llama el barrido cada minuto. */
const RESUMEN: [RegExp, [string, string], [string, string]][] = [
  [/^com_(comment|reply)$/, ["respuesta", "respuestas"], ["reply", "replies"]], [/^com_mention$/, ["mención", "menciones"], ["mention", "mentions"]],
  [/^com_best$/, ["«Me sirvió»", "«Me sirvió»"], ["«Helped me»", "«Helped me»"]], [/^com_votes_10$/, ["publicación con 10 votos", "publicaciones con 10 votos"], ["post with 10 votes", "posts with 10 votes"]],
  [/^com_poll_closed$/, ["encuesta cerrada", "encuestas cerradas"], ["closed poll", "closed polls"]], [/^com_follow$/, ["seguidor nuevo", "seguidores nuevos"], ["new follower", "new followers"]],
  [/^dm_message$/, ["mensaje de un vecino", "mensajes de vecinos"], ["message from a neighbor", "messages from neighbors"]], [/^gam_/, ["aviso de tu rango", "avisos de tu rango"], ["rank update", "rank updates"]],
];
const juntar = (L: string[], es: boolean) => (L.length < 2 ? L.join("") : `${L.slice(0, -1).join(", ")} ${es ? "y" : "and"} ${L[L.length - 1]}`);
export function textoResumen(cuenta: Record<string, number>, es: boolean): string {
  const partes: string[] = [];
  for (const [re, l1, l2] of RESUMEN) {
    const n = Object.entries(cuenta).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    if (n) partes.push(`${n} ${(es ? l1 : l2)[n === 1 ? 0 : 1]}`);
  }
  return (es ? `Hoy en la Comunidad: ${juntar(partes, true)}.` : `Today in the Community: ${juntar(partes, false)}.`).slice(0, 480);
}
export async function resumenComunidad(): Promise<number> {
  const P = (await db().query<{ uid: string; dia: string }>(
    `select u.id::text as uid, (now() at time zone z.tz)::date::text as dia
       from (select distinct user_id from notifications where held_digest and digest_id is null) h
       join users u on u.id = h.user_id left join cities ci on ci.id = u.home_city_id cross join lateral (select coalesce(ci.timezone, 'America/New_York') as tz) z
      where extract(hour from now() at time zone z.tz) >= cfg_int('com_resumen_hora')
        and not exists (select 1 from notif_digests d where d.user_id = u.id and d.local_day = (now() at time zone z.tz)::date)
      limit 500`)).rows;
  let n = 0;
  for (const p of P) {
    const c = await db().connect();
    try {
      await c.query("begin");
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`resumen:${p.uid}`]);
      if ((await c.query(`select 1 from notif_digests where user_id = $1 and local_day = $2::date`, [p.uid, p.dia])).rowCount) { await c.query("rollback"); continue; }
      const H = (await c.query<{ id: string; tpl: string }>(
        `select n.id::text, n.tpl from notifications n where n.user_id = $1 and n.held_digest and n.digest_id is null and ${SIN_BLOQUEO_AVISO} order by n.id for update`, [p.uid])).rows;
      let nid: string | null = null;
      if (H.length) {
        const u = (await c.query<{ lang: string; city: string | null; title: { es: string; en: string } }>(
          `select u.lang, u.home_city_id as city, t.title from users u, notif_templates t where u.id = $1 and t.key = 'com_resumen'`, [p.uid])).rows[0]!;
        const es = u.lang !== "en", cuenta: Record<string, number> = {};
        for (const h of H) cuenta[h.tpl] = (cuenta[h.tpl] ?? 0) + 1;
        // 8c · El resumen sí va por push (con las mismas reglas); se encola DESPUÉS de cerrar la transacción (guardián pushFueraDeTx).
        nid = (await c.query<{ id: string }>(
          `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, push_status)
           select $1, $2, 'com_resumen', $3, $4, '/comunidad', 'resumen', $5, 'no', ${estadoPushSql("u", "tp", "coalesce(ci.timezone, 'America/New_York')", "$6::text[]")}
             from users u join notif_templates tp on tp.key = 'com_resumen' left join cities ci on ci.id = u.home_city_id where u.id = $1 returning id::text`,
          [p.uid, u.city, es ? u.title.es : u.title.en, textoResumen(cuenta, es), p.dia, await canales()])).rows[0]!.id;
        await c.query(`update notifications set digest_id = $2::bigint where id = any($1::bigint[])`, [H.map((h) => h.id), nid]);
      }
      await c.query(`insert into notif_digests (user_id, local_day, notification_id, n) values ($1, $2::date, $3::bigint, $4)`, [p.uid, p.dia, nid, H.length]);
      await c.query("commit");
      if (nid) { n++; await encolar([nid]); }
    } catch { await c.query("rollback").catch(() => {}); } finally { c.release(); }
  }
  return n;
}
