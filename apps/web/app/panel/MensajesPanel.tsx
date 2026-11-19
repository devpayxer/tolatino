"use client";
/* Mensajes (Panel v2 · sec «msg» y det «msg:»): la respuesta automática fuera de horario, la lista de conversaciones (con
   lo sin leer y quién la lleva) y la conversación: burbujas (thread), respuestas rápidas, tu mensaje, quién lo lleva (Pro
   con equipo), compartir tu teléfono, bloquear y reportar.
   7f · «El Compa contesta por ti» (fila que lleva a Panel › El Compa; PRO para Free), la nota «Cuando El Compa está encendido, contesta él y no
   sale la respuesta fija.», las respuestas de El Compa en el hilo con «EL COMPA · IA» y «Sugerir respuesta con El Compa» (Pro): un borrador al
   campo que la persona revisa y envía con su nombre (nunca se envía solo).
   9t · Fotos: «Agregar una foto» (el bloque de fotos del panel) sube la foto PRIVADA (/api/mensajes/foto; la revisa el modelo propio) y sale con
   el mensaje (o sola). En el hilo: la foto, «Foto en revisión» (la del cliente mientras To'Latino la revisa; la tuya la ves con «EN REVISIÓN»)
   o «Foto quitada por To’Latino». «Ver traducción» ES↔EN bajo los mensajes del cliente que no están en tu idioma (lo mismo de la Comunidad,
   con el estado en `ui.tr`: traductor propio, caché y tope; el original se queda). */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { ConvNeg, HiloNeg } from "@/lib/mensajes";
import { LineaTr, traducirCon, type EstTr } from "../(app)/Traducir";
import { subirFotoMensaje } from "@/lib/subir-foto";
import { compaSugerir } from "./acciones-compa";
import { mensajeAsignar, mensajeAuto, mensajeBloquear, mensajeReportarNeg, mensajeResponder, mensajeTelefono } from "./acciones-mensajes";
import type { Ctx, Sec } from "./Panel";

export type MsjPanel = { lista?: { hilos: HiloNeg[]; mas: string | null; sinLeer: number; auto: boolean }; det?: ConvNeg | null; hoy?: HiloNeg[]; n: number;
  compa?: { pro: boolean; enabled: boolean; on: boolean; apagadoPor: boolean; cuando: { es: string; en: string } } | null; sugerir?: boolean };

function hace(c: Ctx, iso: string, ahora: number) {
  const min = Math.floor((ahora - new Date(iso).getTime()) / 60000), E2 = c.E2;
  if (min < 1) return E2("AHORA", "NOW");
  if (min < 60) return E2(`HACE ${min} MIN`, `${min} MIN AGO`);
  if (min < 1440) return E2(`HACE ${Math.floor(min / 60)} H`, `${Math.floor(min / 60)} H AGO`);
  return new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "").toUpperCase();
}
/* Los avisos del sistema se guardan en los dos idiomas («es · en»): se muestra el de la pantalla. */
const sistema = (t: string, es: boolean) => (es ? t.split(" · ")[0]! : t.split(" · ")[1] ?? t);
const ctxL = (c: Ctx, x: { ctx: { es: string; en: string } | null }) => (x.ctx ? (c.es ? x.ctx.es : x.ctx.en) : c.E2("Consulta general", "General question"));
function fila(c: Ctx, x: HiloNeg) {
  const { E2 } = c;
  return {
    key: x.id, icon: "chat", t: `${x.quien} · ${ctxL(c, x)}`,
    s: `${x.lastFrom === "business" ? E2("Tú: ", "You: ") : x.lastFrom === "auto" ? (x.lastCompa ? "El Compa: " : E2("Automática: ", "Auto: ")) : ""}${x.lastFrom === "system" || x.last === "Foto · Photo" ? sistema(x.last ?? "", c.es) : x.last ?? ""}`,
    m: `${hace(c, x.at, c.ahora)}${x.lleva ? E2(` · LO LLEVA ${x.lleva.toUpperCase()}`, ` · HANDLED BY ${x.lleva.toUpperCase()}`) : ""}${x.bloqueado ? E2(" · BLOQUEADO", " · BLOCKED") : ""}`,
    tag: x.unread ? String(x.unread) : null, tone: "action", onClick: () => c.det(`msg:${x.id}`),
  };
}

export function mensajesBloques(c: Ctx): Sec {
  const { E2, d } = c, L = c.msj?.lista;
  const out: (Bloque | null)[] = [
    { type: "head", t: E2("Mensajes", "Messages"), s: E2("Tu teléfono no se muestra: todo pasa por aquí hasta que tú lo compartas.", "Your phone stays hidden: everything goes through here until you share it.") },
    { type: "rows", items: [{ icon: "clock", t: E2("Respuesta automática fuera de horario", "Auto-reply when closed"), s: E2("«Gracias. Te contestamos cuando abramos.»", "“Thanks. We reply when we open.”"),
      tgOn: !!L?.auto, onTg: () => c.run(() => mensajeAuto(d.id, !L?.auto), L?.auto ? E2("Respuesta automática apagada.", "Auto-reply off.") : E2("Encendida: cuando estés cerrado, contesta sola (una vez cada 12 horas por cliente).", "On: when you are closed, it replies (once every 12 hours per client).")) },
      ...(c.msj?.compa ? [((k) => ({ icon: "help", t: E2("El Compa contesta por ti", "El Compa replies for you"),
        s: k.pro ? (k.on ? E2(`Encendido · ${k.cuando.es}`, `On · ${k.cuando.en}`) : k.apagadoPor ? E2("Lo apagó To’Latino. Escríbele a Soporte.", "Turned off by To’Latino. Write to Support.")
          : k.enabled ? E2("Encendido, pero El Compa no está contestando ahora: sale tu respuesta de siempre.", "On, but El Compa is not replying right now: your usual reply goes out.") : E2("Apagado. Contesta horario, menú y cómo pedir con los datos de tu página.", "Off. Answers hours, menu and how to order from your page."))
          : E2("Con Pro: contesta horario, menú y cómo pedir cuando tú no puedes.", "With Pro: answers hours, menu and how to order when you can’t."),
        tag: k.pro ? (k.on ? E2("ENCENDIDO", "ON") : null) : "PRO", tone: k.on ? "signal" : "neutral", onClick: () => c.go("cpa") }))(c.msj.compa)] : []),
    ] },
  ];
  if (L?.auto && c.msj?.compa?.on) out.push({ type: "note", tone: "info", icon: "help", t: E2("Cuando El Compa está encendido, contesta él y no sale la respuesta fija.", "When El Compa is on, it replies and the fixed reply does not go out.") });
  if (!L || !L.hilos.length) { out.push({ type: "empty", icon: "chat", t: E2("Sin mensajes", "No messages"), s: E2("Cuando un cliente te escriba, sale aquí. Te avisamos al teléfono.", "When a client writes, it shows here. We let you know on your phone.") }); return { blocks: out, ed: null }; }
  out.push({ type: "rows", k: L.sinLeer ? E2(`${L.sinLeer} SIN LEER`, `${L.sinLeer} UNREAD`) : undefined, items: L.hilos.map((x) => fila(c, x)) });
  if (L.mas) out.push({ type: "acts", items: [{ l: E2("Ver más antiguas", "See older"), v: "secondary", onClick: () => c.nav(`/panel/${d.id}/mensajes?antes=${encodeURIComponent(L.mas!)}`) }] });
  return { blocks: out, ed: null };
}

/* Hoy · «Mensajes sin responder». */
export function hoyMensajes(c: Ctx): Bloque[] {
  const { E2, d } = c, L = c.msj?.hoy ?? [];
  if (!L.length) return [];
  return [{ type: "rows", k: E2("MENSAJES SIN RESPONDER", "UNANSWERED MESSAGES"), link: E2("Ver todos", "See all"), onLink: () => c.go("msg"),
    items: L.map((x) => ({ ...fila(c, x), compact: true, onClick: () => c.nav(`/panel/${d.id}/mensajes?det=msg:${x.id}`) })) }];
}

export function mensajeDetalle(c: Ctx): Sec {
  const { E2, es, d } = c, x = c.msj?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Conversación no encontrada", "Conversation not found"), onBack: c.closeDet }, { type: "empty", icon: "chat", t: E2("Esa conversación no está", "That conversation is not here"), s: E2("Vuelve a Mensajes.", "Go back to Messages.") }], ed: null };
  const key = `det:msg:${x.id}`, F = c.form(key, { txt: "", foto: "", fotoUrl: "", rev: "" }), t = F.d.txt;
  // 9t · «Ver traducción» con el estado en ui.tr (las secciones del panel no son componentes: sin hooks).
  const tr = traducirCon(es, (c.ui.tr ?? {}) as Record<string, EstTr>, (k, e) => c.setUi((z) => ({ tr: { ...(z.tr ?? {}), [k]: e } })));
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("CONVERSACIÓN · ", "CONVERSATION · ")}${ctxL(c, x)}`.toUpperCase(), t: x.quien, s: x.lleva ? E2(`La lleva ${x.lleva}`, `Handled by ${x.lleva}`) : undefined, onBack: c.closeDet },
    { type: "thread", items: x.msjs.map((m) => {
      const y = m.oculto || m.de !== "user" ? { body: m.t, translate: undefined } : tr("chat_message", m.id, m.lang, m.t, false);
      return {
        key: m.id, mine: m.de === "business", soft: m.de === "auto" || m.de === "system" || m.oculto || (m.fotoEst === "quitada" && !m.t),
        t: m.oculto ? E2("Mensaje oculto por To’Latino.", "Message hidden by To’Latino.") : m.de === "system" ? sistema(m.t, es) : m.fotoEst === "quitada" && !m.t ? E2("Foto quitada por To’Latino.", "Photo removed by To’Latino.") : y.body,
        img: m.foto, imgAlt: E2("Foto", "Photo"),
        imgL: m.foto || !m.fotoEst || m.fotoEst === "quitada" ? undefined : m.fotoEst === "revision" ? E2("Foto en revisión", "Photo under review") : E2("Foto", "Photo"),
        tr: y.translate ? <LineaTr t={y.translate} mt={0} /> : undefined,
        m: `${m.fotoEst === "revision" && m.de === "business" ? E2("EN REVISIÓN · ", "UNDER REVIEW · ") : ""}${m.de === "auto" ? (m.compa ? E2("EL COMPA · IA · ", "EL COMPA · AI · ") : E2("RESPUESTA AUTOMÁTICA · ", "AUTO-REPLY · ")) : m.de === "business" && m.quien ? `${m.quien.toUpperCase()} · ` : ""}${hace(c, m.at, c.ahora)}`,
      };
    }) },
  ];
  if (x.bloqueado) out.push({ type: "note", tone: "warn", icon: "ban", t: E2("Bloqueaste a esta persona: no te puede escribir.", "You blocked this person: they cannot write to you."), cta: E2("Desbloquear", "Unblock"), onCta: () => c.run(() => mensajeBloquear(d.id, x.id, false), E2("Desbloqueado.", "Unblocked.")) });
  out.push(
    { type: "chips", k: E2("RESPUESTAS RÁPIDAS", "QUICK REPLIES"), items: [E2("Sí, claro.", "Yes, of course."), E2("Te confirmo en un rato.", "I will confirm shortly."), E2("Gracias por escribir.", "Thanks for writing.")].map((q) => ({ l: q, v: "filter", onClick: () => F.set({ txt: q }) })) },
    { type: "field", k: E2("TU MENSAJE", "YOUR MESSAGE"), val: t, area: true, rows: 2, max: 1000, count: `${t.length}/1000`, ph: E2("Escribe…", "Type…"), onChange: (v: string) => F.set({ txt: v.slice(0, 1000) }) },
    // 9t · La foto que sale con el mensaje (una): tocarla la quita.
    { type: "photos", k: E2("FOTO", "PHOTO"), count: `${F.d.foto ? 1 : 0}/1`, cols: 4, items: F.d.fotoUrl ? [{ bg: `url("${F.d.fotoUrl}")`, key: F.d.foto, tag: F.d.rev ? E2("EN REVISIÓN", "UNDER REVIEW") : undefined, onClick: () => F.set({ foto: "", fotoUrl: "", rev: "" }) }] : [],
      addL: E2("Agregar una foto", "Add a photo"), onAdd: F.d.foto || c.ui.msjSube ? undefined : () => c.pickFiles(false, async (fs) => {
        c.setUi({ msjSube: true });
        const r = await subirFotoMensaje(fs[0]!).catch(() => ({ ok: false as const, mensaje: undefined, revision: false }));
        c.setUi({ msjSube: false });
        if (r.ok && r.id && r.url) F.set({ foto: r.id, fotoUrl: r.url, rev: r.revision ? "1" : "" });
        else c.toast(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "The photo could not be uploaded."));
      }) },
    F.d.foto ? { type: "note", tone: F.d.rev ? "warn" : "info", icon: "image", t: F.d.rev ? E2("To’Latino la revisa antes de que el cliente la vea. Toca la foto para quitarla.", "To’Latino reviews it before the client sees it. Tap the photo to remove it.") : E2("Sale con tu mensaje. Toca la foto para quitarla.", "It goes with your message. Tap the photo to remove it.") }
      : c.ui.msjSube ? { type: "note", tone: "info", icon: "image", t: E2("Subiendo la foto…", "Uploading the photo…") } : null,
    { type: "acts", items: [{ l: E2("Enviar", "Send"), v: "primary", icon: "right", off: c.pending || !!c.ui.msjSube || (!t.trim() && !F.d.foto), onClick: () => c.run(() => mensajeResponder(d.id, x.id, t, F.d.foto || null), (r: { revision?: boolean }) => (r?.revision ? E2("Enviado. Tu foto se ve cuando To’Latino la revise.", "Sent. Your photo shows once To’Latino reviews it.") : E2("Enviado.", "Sent.")), () => F.set({ txt: "", foto: "", fotoUrl: "", rev: "" })) }] },
  );
  // 7f · «Sugerir respuesta con El Compa» (Pro): el borrador va al campo; lo envía la persona, con su nombre. Nunca se envía solo.
  if (c.msj?.sugerir) {
    const sug = c.pending && c.ui.cpaSug === x.id;
    out.push({ type: "acts", items: [{ l: sug ? E2("El Compa está escribiendo…", "El Compa is writing…") : E2("Sugerir respuesta con El Compa", "Suggest a reply with El Compa"), v: "secondary", icon: "help", off: c.pending,
      onClick: () => { c.setUi({ cpaSug: x.id }); c.run(() => compaSugerir(d.id, x.id), E2("Revísalo antes de enviar. Sale con tu nombre.", "Check it before sending. It goes out with your name."), (r: { texto?: string }) => { c.setUi({ cpaSug: null }); if (r.texto) F.set({ txt: r.texto.slice(0, 1000) }); }); } }] });
  }
  if (d.pro && x.equipo.length > 1) out.push({ type: "chips", k: E2("QUIÉN LO LLEVA", "WHO HANDLES IT"), items: x.equipo.map((p) => ({ l: p.nombre, v: x.llevaId === p.id ? "selected" : "filter", onClick: () => c.run(() => mensajeAsignar(d.id, x.id, x.llevaId === p.id ? null : p.id), E2("Listo.", "Done.")) })) });
  out.push({ type: "acts", items: [
    ...(x.telCompartido ? [] : [{ l: E2("Compartir mi teléfono", "Share my phone"), icon: "phone", onClick: () => c.run(() => mensajeTelefono(d.id, x.id), E2("Le mandamos el teléfono de tu página.", "We sent them your page’s phone.")) }]),
    ...(x.bloqueado ? [] : [{ l: E2("Bloquear", "Block"), icon: "ban", onClick: () => c.run(() => mensajeBloquear(d.id, x.id, true), E2("Bloqueado: ya no te puede escribir.", "Blocked: they can no longer write to you.")) }]),
    { l: E2("Reportar a To’Latino", "Report to To’Latino"), icon: "warning", onClick: () => c.run(() => mensajeReportarNeg(d.id, x.id, "otro"), E2("Gracias. To’Latino lo revisa en 48 horas.", "Thank you. To’Latino reviews it within 48 hours.")) },
  ] });
  return { blocks: out, ed: null };
}
