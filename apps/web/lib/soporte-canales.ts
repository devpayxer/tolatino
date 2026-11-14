import "server-only";
import { db } from "./db";

/* 9l · La respuesta del equipo de Soporte FUERA de la app (después del commit; nunca rompe la respuesta, que ya está en el caso y en la campana):
   - Por correo (L980): «Te respondieron en tu caso TK-…» al correo CONFIRMADO de la persona (si tiene «Correo» de avisos encendido o el caso entró por
     correo). Si el caso entró por correo, el correo lleva el texto de la respuesta (la persona eligió escribir por ahí; el asunto lleva el número para que
     su respuesta vuelva al caso); si no, solo el aviso y el enlace (lo de Soporte puede ser delicado: se lee en la app con la sesión).
   - Por WhatsApp (L1118): si el caso entró por WhatsApp, dentro de la ventana de 24 h (lib/compa/canales.ts responderCasoPorWhatsApp; fuera, la plantilla
     aprobada o nada).
   Cada salida queda en support_replies_out (solo inserción). */
export async function respuestaFueraDeLaApp(x: { caseId: string; numero: string; mid: string; texto: string; quien: string }): Promise<{ correo: string; whatsapp: string }> {
  const k = (await db().query<{ origin: string; uid: string; email: string | null; verif: boolean; mail: boolean; lang: string; city: string | null }>(
    `select c.origin, c.user_id::text as uid, u.email::text as email, coalesce(u.email_verified, false) as verif, coalesce((u.notif_prefs ->> 'mailR')::boolean, true) as mail,
            coalesce(u.lang, 'es') as lang, u.home_city_id as city
       from support_cases c join users u on u.id = c.user_id where c.id = $1::bigint and u.status not in ('deleted', 'merged')`, [x.caseId])).rows[0];
  if (!k) return { correo: "no", whatsapp: "no" };
  const anotar = (canal: "correo" | "whatsapp", estado: string, emailId: string | null, compaId: string | null) => db().query(
    `insert into support_replies_out (case_id, message_id, channel, status, email_id, compa_out_id) values ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6::bigint) on conflict (message_id, channel) do nothing`,
    [x.caseId, x.mid, canal, estado, emailId, compaId]).catch(() => undefined);
  // ── Correo ──
  let correo = "sin_correo";
  if (k.email && k.verif && (k.mail || k.origin === "correo")) {
    const { BASE_URL, encolar } = await import("./correo"), { marco } = await import("./correo/plantillas");
    const es = k.lang !== "en", href = `${BASE_URL()}/soporte?caso=${encodeURIComponent(x.numero)}`, quien = x.quien || (es ? "El equipo" : "The team");
    const conTexto = k.origin === "correo";
    const { html, text } = marco({ es, pre: es ? `Te respondieron en ${x.numero}` : `You got a reply in ${x.numero}`, titulo: es ? `Te respondieron en tu caso ${x.numero}` : `You got a reply in your case ${x.numero}`,
      intro: conTexto ? `${quien}: ${x.texto}` : es ? `${quien}, de Soporte de To'Latino, te respondió. Léelo y contesta en tu caso.` : `${quien}, from To'Latino Support, replied. Read it and answer in your case.`,
      nota: conTexto ? (es ? "Para contestar, responde este correo sin cambiar el asunto, o entra a tu caso." : "To answer, reply to this email keeping the subject, or open your case.") : undefined,
      cta: { l: es ? "Ver mi caso" : "See my case", href } });
    const r = await encolar({ userId: k.uid, city: k.city, to: k.email, tpl: "support_reply", subject: es ? `Re: tu caso ${x.numero} · Soporte de To'Latino` : `Re: your case ${x.numero} · To'Latino Support`,
      html, text, ref: ["support", x.numero], idem: `sop-resp-${x.mid}` }).catch(() => null);
    correo = r?.status ?? "fallo";
    await anotar("correo", correo, r?.id ?? null, null);
  } else await anotar("correo", "sin_correo", null, null);
  // ── WhatsApp (dentro de las 24 h) ──
  let whatsapp = "no";
  if (k.origin === "compa") {
    whatsapp = await (await import("./compa/canales")).responderCasoPorWhatsApp({ caseId: x.caseId, numero: x.numero, texto: x.texto }).catch(() => "fallo");
    if (whatsapp !== "no") {
      const o = (await db().query<{ id: string }>(`select id::text from compa_outbound where kind in ('soporte', 'plantilla') and created_at > now() - interval '1 minute'
                                                     and conversation_id = (select compa_conversation_id from support_cases where id = $1::bigint) order by compa_outbound.id desc limit 1`, [x.caseId])).rows[0];
      const st = ["enviado", "pruebas", "simulado", "ventana", "apagado", "fallo", "pendiente", "sin_proveedor", "baja", "silencio", "plantilla", "entregado"].includes(whatsapp) ? (whatsapp === "entregado" ? "enviado" : whatsapp) : "fallo";
      await anotar("whatsapp", st, null, o?.id ?? null);
    }
  }
  return { correo, whatsapp };
}
