import "server-only";
import { createHash } from "node:crypto";
import { cfgSql } from "./config";
import { db } from "./db";
import { enComunidad, sinBloqueos } from "./comunidad";
import { FUENTE_TR_DM } from "./mensajes-vecinos";
import { MOTOR, SinTraductor, traducirTexto } from "./traductor";
import { NO_DISPONIBLE, esKindTr, type KindTr, type LangTr, type ResTr } from "./traduccion-comun";

/* 5h · «Ver traducción» (D3; fase5-comunidad.md §4 5h). traducir(kind, id, quien, dst):
   1. Límite por persona (o por dispositivo, sin cuenta): `com_traduccion_hora` en una hora (trad_usar, atómico).
   2. El texto, tal como lo puede ver quien pide (las mismas reglas que la pantalla: visible, sin bloqueos, Novedades en vivo para su
      público, la respuesta del negocio solo si es Pro). Lo que no se puede ver no se traduce («ya no está»).
   3. Caché ugc_translations por (qué, cuál, a qué idioma, sha-256 del texto): si el texto se editó, el hash cambia y se traduce otra vez.
   4. Si no está, el traductor propio (lib/traductor.ts: 3 s, corta-circuito) y se guarda con el motor y lo que tardó.
   El Super Admin nunca pasa por aquí: ve siempre el original (guardián adminVeOriginal). Nada se inventa: sin traductor, el motivo. */
type Bi = { es: string; en: string };
export type Quien = { userId: string | null; dispositivo: string | null };
const no = (motivo: Extract<ResTr, { ok: false }>["motivo"], msg: Bi): ResTr => ({ ok: false, motivo, msg });
const NO_ESTA: Bi = { es: "Este texto ya no está.", en: "This text is no longer available." };
export const huella = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");
const TOPE = cfgSql("com_traduccion_hora"); // 5i · valor de Configuración (lib/config.ts)

/* El texto y su idioma, si quien pide lo puede ver. $1 = la persona (o null), $2 = el id. */
const FUENTE: Record<KindTr, string> = {
  com_post: `select p.body as texto, p.lang from com_posts p
     where p.id = $2::bigint and p.publish_at <= now() and (p.status = 'visible' or (p.status = 'hidden' and p.author_user_id = $1::uuid))
       and ${sinBloqueos("p.author_user_id", "$1::uuid")}
       and not exists (select 1 from com_hidden_for h where h.user_id = $1::uuid and h.target_kind = 'post' and h.target_id = p.id)`,
  com_comment: `select cm.body as texto, cm.lang from com_comments cm join com_posts p on p.id = cm.post_id
     where cm.id = $2::bigint and cm.status = 'visible' and p.status = 'visible' and p.publish_at <= now()
       and ${sinBloqueos("cm.author_user_id", "$1::uuid")} and ${sinBloqueos("p.author_user_id", "$1::uuid")}
       and not exists (select 1 from com_hidden_for h where h.user_id = $1::uuid and h.target_kind = 'comment' and h.target_id = cm.id)`,
  review: `select r.body as texto, r.lang from reviews r join businesses b on b.id = r.business_id and b.status = 'active'
     where r.id = $2::bigint and (r.status = 'visible' or r.user_id = $1::uuid)`,
  review_reply: `select r.reply as texto, coalesce(r.reply_lang, 'es') as lang from reviews r join businesses b on b.id = r.business_id and b.status = 'active'
       join business_stats_cache s on s.business_id = b.id and s.plan = 'pro'
     where r.id = $2::bigint and r.status = 'visible' and r.reply is not null and ($1::uuid is null or true)`,
  post_comment: `select c.body as texto, c.lang from post_comments c join business_posts p on p.id = c.post_id
     where c.id = $2::bigint and c.status = 'visible' and post_en_vivo(p)
       and (p.audience = 'all' or exists (select 1 from follows f where f.follower_user_id = $1::uuid and f.target_kind = 'business' and f.target_id = p.business_id))`,
  /* 9t · Un mensaje de Mensajes (cliente ↔ negocio): solo para una de las dos partes (el vecino de la conversación, o alguien del equipo del negocio
     con la parte «Mensajes» del panel, como accesoPanel), visible, escrito por una persona y con su idioma guardado. El equipo de To'Latino no
     traduce (ve siempre el original: guardián adminVeOriginal) y la vista de solo lectura del panel no es miembro del negocio. */
  chat_message: `select m.body as texto, m.lang from chat_messages m join chat_threads t on t.id = m.thread_id
     where m.id = $2::bigint and m.hidden_at is null and m.sender in ('user', 'business') and m.lang is not null and m.body <> ''
       and (t.user_id = $1::uuid or exists (select 1 from business_members bm join businesses b on b.id = bm.business_id and b.status <> 'merged'
         where bm.business_id = t.business_id and bm.user_id = $1::uuid and bm.status = 'active' and bm.panel_off_at is null
           and (bm.kind = 'owner' or 'all' = any(bm.panel_access) or 'msg' = any(bm.panel_access))))`,
  /* 9t (19 nov) · Un mensaje entre vecinos (Comunidad › Mensajes): solo para una de las dos personas, la conversación abierta y sin bloqueo, el mensaje
     visible y con su idioma guardado. La consulta vive en lib/mensajes-vecinos.ts (solo ese archivo y admin-dm.ts leen esos mensajes). */
  dm_message: FUENTE_TR_DM,
};
// 9t · Mensajes entre vecinos es de la Comunidad: pide cuenta y haber entrado a la Comunidad (como las publicaciones).
const DE_LA_COMUNIDAD = (k: KindTr) => k === "com_post" || k === "com_comment" || k === "dm_message";
const CON_CUENTA = (k: KindTr) => DE_LA_COMUNIDAD(k) || k === "chat_message"; // 9t · Mensajes también pide cuenta (y ser una de las partes: FUENTE)

export async function traducir(kind: unknown, id: unknown, q: Quien, dst: LangTr): Promise<ResTr> {
  if (!esKindTr(kind) || typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("no_esta", NO_ESTA);
  if (CON_CUENTA(kind) && !q.userId) return no("entrar", { es: "Entra para seguir.", en: "Sign in to continue." });
  if (DE_LA_COMUNIDAD(kind) && q.userId && !(await enComunidad(q.userId)).ok) return no("no_esta", NO_ESTA);
  const who = q.userId ? `u:${q.userId}` : q.dispositivo ? `d:${q.dispositivo}` : null;
  if (!who) return no("limite", { es: "Recarga la página para ver la traducción.", en: "Reload the page to see the translation." });
  const lim = (await db().query<{ ok: boolean; tope: number }>(`select trad_usar($1, ${TOPE}) as ok, ${TOPE} as tope`, [who])).rows[0]!;
  if (!lim.ok) return no("limite", { es: `Llegaste a ${lim.tope} traducciones en esta hora. Vuelve en un rato.`, en: `You reached ${lim.tope} translations this hour. Come back in a while.` });

  const f = (await db().query<{ texto: string | null; lang: string }>(FUENTE[kind], [q.userId, id])).rows[0];
  const texto = f?.texto?.trim() ?? "";
  if (!f || !texto) return no("no_esta", NO_ESTA);
  const de: LangTr = f.lang === "en" ? "en" : "es";
  if (de === dst) return no("mismo", { es: "Ya está en tu idioma.", en: "It's already in your language." });

  const h = huella(texto);
  const c = (await db().query<{ text: string }>(
    `select text from ugc_translations where target_kind = $1 and target_id = $2::bigint and dst_lang = $3 and src_hash = $4`, [kind, id, dst, h])).rows[0];
  if (c) return { ok: true, texto: c.text, de, cache: true };

  try {
    const t = await traducirTexto(texto, de, dst);
    await db().query(
      `insert into ugc_translations (target_kind, target_id, src_lang, dst_lang, src_hash, text, engine, ms) values ($1, $2::bigint, $3, $4, $5, $6, $7, $8)
       on conflict do nothing`, [kind, id, de, dst, h, t.texto, MOTOR, t.ms]);
    return { ok: true, texto: t.texto, de, cache: false };
  } catch (e) {
    if (e instanceof SinTraductor) return no("servicio", NO_DISPONIBLE);
    throw e;
  }
}
