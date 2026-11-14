import "server-only";
import { db } from "../db";
import { enviarSms, type EstadoSms } from "./index";

/* 9l · El SMS del código para entrar (y del código del reclamo de un negocio): su texto es la plantilla `cuenta_codigo` (Super Admin › Notificaciones,
   editable en ES y EN; siempre lleva {codigo}), en el idioma de la cuenta de ese teléfono (o el de la pantalla). Al final, la línea que el teléfono
   reconoce para llenar el código solo (WebOTP / iOS: «@dominio #código»; no se edita). Sale por el único camino de los SMS (reintentos mientras el
   código no venza; el texto viaja cifrado). */
const BASE = () => (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");
export async function smsCodigo(tel: string, codigo: string, minutos: number, lang: "es" | "en"): Promise<{ id: string; estado: EstadoSms } | null> {
  const r = (await db().query<{ body: { es: string; en: string }; lang: string | null; city: string | null }>(
    `select t.body, (select u.lang from users u where u.phone = $1 and u.status not in ('deleted', 'merged') limit 1) as lang,
            (select u.home_city_id from users u where u.phone = $1 and u.status not in ('deleted', 'merged') limit 1) as city
       from notif_templates t where t.key = 'cuenta_codigo'`, [tel]).catch(() => ({ rows: [] }))).rows[0];
  const es = (r?.lang ?? lang) !== "en";
  const base = r ? (es ? r.body.es : r.body.en) : es ? "{codigo} es tu código de To'Latino. Vence en {min} minutos." : "{codigo} is your To'Latino code. It expires in {min} minutes.";
  // Sin {codigo} el SMS no serviría: se usa el de fábrica (la edición tampoco lo deja quitar).
  const t = (base.includes("{codigo}") ? base : "{codigo} · To'Latino").replace(/\{codigo\}/g, codigo).replace(/\{min\}/g, String(minutos));
  let host = "tolatino.com";
  try { host = new URL(BASE()).host; } catch { /* el de fábrica */ }
  return enviarSms({ tel, texto: `${t}\n\n@${host} #${codigo}`, tpl: "cuenta_codigo", origen: { kind: "codigo" }, ciudad: r?.city ?? null, venceSeg: minutos * 60 });
}
