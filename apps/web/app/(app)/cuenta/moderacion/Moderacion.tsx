"use client";
/* 5d · Mi cuenta › Avisos de moderación (hueco #3; adm-data msgs0 «Recibimos tu apelación. Te respondemos en 72 h.»): el aviso
   («Ocultamos tu comentario: {motivo}») → «Apelar» (20–500 letras, una vez, 14 días) → «Recibimos tu apelación…» → el resultado
   (otra persona del equipo decide; es final). La lista junta lo oculto y las sanciones vivas, y las apelaciones ya decididas. Los
   bloques salen del marco de Mi cuenta (sección, nota, KV, formulario, acciones, filas). El servidor decide.
   R3 · Revisión automática de las fotos públicas (decisión AJ): una foto que no se publicó (retenida, rechazada u oculta por reportes) sale aquí con su
   miniatura (el visor privado /api/medios/revision/{id}; sin almacén, el marcador del sistema), su estado, el motivo en el idioma de la persona y
   «Pedir revisión» (pedirRevisionFoto: la misma apelación de siempre, una vez, 20–500 letras). Después dice que una persona la va a mirar. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvisoMod, MisAvisos } from "@/lib/apelaciones";
import { APELABLE, MAX_APELACION, MIN_APELACION } from "@/lib/moderacion-comun";
import { pedirRevisionFoto } from "../../acciones";
import { apelarAccion } from "./acciones";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { dosIdiomas } from "@/lib/dos-idiomas";

export function Moderacion({ es, yo, uno, buscado, lista }: { es: boolean; yo: Yo; uno: AvisoMod | null; buscado: boolean; lista: MisAvisos | null }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), ui = useCuentaUi();
  const [txt, setTxt] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const dia = (d: string) => new Date(d).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" });
  const que = (a: AvisoMod) => (es ? a.que.es : a.que.en);
  const bi = (x: { es: string; en: string }) => (es ? x.es : x.en);
  /* R3 · El estado de una foto de la revisión automática: la etiqueta y su tono en el sistema (EN REVISIÓN es un estado, no un fallo). */
  const estadoFoto = (a: AvisoMod): [string, string] | null => !a.fotoRev ? null : a.fotoRev.estado === "rechazada" ? [E2("NO SE PUBLICÓ", "NOT PUBLISHED"), "danger"]
    : a.fotoRev.estado === "oculta" ? [E2("OCULTA POR REPORTES", "HIDDEN BY REPORTS"), "neutral"] : [E2("EN REVISIÓN", "UNDER REVIEW"), "action"];
  const t = E2("Avisos de moderación", "Moderation notices"), s = E2("LO QUE OCULTAMOS Y TUS APELACIONES", "WHAT WE HID AND YOUR APPEALS");

  if (buscado) {
    if (!uno) return <Marco es={es} code="USR-MODERACION" t={t} s={s} yo={yo} ui={ui} back="/cuenta/moderacion" blocks={[
      { type: "empty", ic: "shield", t: E2("No encontramos este aviso", "We could not find this notice"), s: E2("Puede que ya se vea otra vez o que la sanción ya terminó.", "It may be visible again or the sanction may have ended."), cta: E2("Ver mis avisos", "See my notices"), onCta: () => router.push("/cuenta/moderacion") },
    ]} />;
    const a = uno, ap = a.apelacion, k = APELABLE[a.k];
    const enviar = async () => {
      if (busy) return;
      const x = txt.trim();
      if (x.length < MIN_APELACION) return setErr(E2(`Cuéntanos un poco más: al menos ${MIN_APELACION} letras.`, `Tell us a bit more: at least ${MIN_APELACION} characters.`));
      setBusy(true); setErr(null);
      const r = a.fotoRev ? await pedirRevisionFoto(a.id, x).catch(() => null) : await apelarAccion(a.k, a.id, x).catch(() => null); setBusy(false);
      if (!r || !r.ok) return setErr(r && "msg" in r && r.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
      ui.toast(a.fotoRev ? E2("Listo. Una persona va a mirar tu foto. Te respondemos en 72 h.", "Done. A person will look at your photo. We will answer within 72 h.") : E2("Recibimos tu apelación. Te respondemos en 72 h.", "We received your appeal. We will answer within 72 h.")); setTxt(""); router.refresh();
    };
    const fr = a.fotoRev;
    const notaFoto: Bloque = !fr ? (null as never) : fr.estado === "rechazada"
      ? { type: "note", tone: ap?.estado === "lifted" ? "ok" : "danger", ic: "shield", t: `${que(a)}${fr.motivo ? `: ${bi(fr.motivo)}` : ""}`, s: E2("Solo tú la ves. Nada se borra. Si crees que es un error, pide que la revise una persona.", "Only you can see it. Nothing is deleted. If you think it is a mistake, ask a person to review it.") }
      : fr.estado === "oculta"
        ? { type: "note", tone: "warn", ic: "shield", t: que(a), s: E2("Varias personas la reportaron: está oculta mientras se revisa. Si no rompe las reglas, vuelve a verse. También puedes pedir que la revise una persona.", "Several people reported it: it stays hidden while it is reviewed. If it does not break the rules, it shows again. You can also ask a person to review it.") }
        : { type: "note", tone: "info", ic: "clock", t: que(a), s: E2("La revisamos antes de publicarla. Te avisamos en cuanto esté lista. Si la necesitas ya, pide que la revise una persona.", "We review it before it is published. We will let you know as soon as it is ready. If you need it now, ask a person to review it.") };
    const B: (Bloque | null | false)[] = [
      fr ? notaFoto : { type: "note", tone: ap?.estado === "lifted" ? "ok" : "danger", ic: a.k === "sanction" ? "warning" : "shield", t: `${que(a)}${a.motivo ? `: ${a.motivo}` : ""}`,
        s: a.auto ? E2("Varios vecinos lo reportaron. Queda oculto mientras una persona de To'Latino lo revisa; si no rompe las reglas, vuelve a verse.", "Several neighbors reported it. It stays hidden while a person from To'Latino reviews it; if it does not break the rules, it shows again.")
          : a.k === "sanction" && a.efecto ? (es ? a.efecto.es : a.efecto.en) : E2("Solo tú lo ves. Nada se borra.", "Only you can see it. Nothing is deleted.") },
      { type: "kv", rows: ([
        a.k !== "sanction" && a.texto ? { k: a.k === "media" ? E2("PUBLICACIÓN", "POST") : E2(`TU ${k.es.toUpperCase()}`, `YOUR ${k.en.toUpperCase()}`), v: a.texto } : null,
        { k: E2("CUÁNDO", "WHEN"), v: dia(a.at) },
        a.hasta ? { k: E2("TERMINA", "ENDS"), v: dia(a.hasta) } : null,
        !ap ? { k: E2("PUEDES APELAR HASTA", "YOU CAN APPEAL UNTIL"), v: dia(a.vence) } : null,
        a.href ? { k: E2("DÓNDE", "WHERE"), v: E2("Ver dónde estaba", "See where it was"), l: E2("Abrir", "Open"), on: () => router.push(a.href!) } : null,
      ] as ({ k: string; v: string; l?: string; on?: () => void } | null)[]).filter((x): x is { k: string; v: string; l?: string; on?: () => void } => !!x) },
    ];
    if (fr) B.push({ type: "rows", rows: [{ key: "foto", t: E2("Tu foto", "Your photo"), s: E2("SOLO TÚ LA VES", "ONLY YOU SEE IT"), ph: a.foto, phIc: true, tag: estadoFoto(a) }] });
    else if (a.foto) B.push({ type: "rows", rows: [{ t: E2("La foto que quitamos", "The photo we removed"), ph: a.foto, ic: "image" }] });
    if (ap) {
      B.push({ type: "sec", t: fr ? E2(`Tu pedido de revisión · ${ap.numero}`, `Your review request · ${ap.numero}`) : E2(`Tu apelación · ${ap.numero}`, `Your appeal · ${ap.numero}`) });
      B.push(ap.estado === "open"
        ? fr ? { type: "note", tone: "info", ic: "clock", t: E2("Una persona de To'Latino va a mirar tu foto.", "A person from To'Latino will look at your photo."), s: E2("Te respondemos en 72 h y te avisamos con su decisión. La revisa otra persona del equipo, no quien la decidió.", "We answer within 72 h and let you know what they decide. Another person on the team reviews it, not the one who decided.") }
          : { type: "note", tone: "info", ic: "clock", t: E2("Recibimos tu apelación. Te respondemos en 72 h.", "We received your appeal. We will answer within 72 h."), s: E2("La revisa otra persona del equipo, no quien lo decidió.", "Another person on the team reviews it, not the one who decided.") }
        : ap.estado === "lifted"
          ? { type: "note", tone: "ok", ic: "check", t: fr ? E2("Tenías razón: tu foto se publicó.", "You were right: your photo was published.") : E2("Tenías razón: lo devolvimos.", "You were right: we restored it."), s: ap.decision ?? "" }
          : { type: "note", tone: "warn", ic: "shield", t: E2("Se mantiene la decisión. Esta revisión es final.", "The decision stands. This review is final."), s: ap.decision ?? "" });
      B.push({ type: "kv", rows: [{ k: E2("LO QUE ESCRIBISTE", "WHAT YOU WROTE"), v: ap.texto }, { k: E2("ENVIADA", "SENT"), v: dia(ap.at) }, ...(ap.decidida ? [{ k: E2("DECIDIDA", "DECIDED"), v: dia(ap.decidida) }] : [])] });
    } else if (a.puedeApelar) {
      B.push(fr ? { type: "sec", t: E2("Pedir revisión", "Ask for a review"), s: E2("Cuéntanos qué se ve en la foto y por qué está bien. Una persona del equipo la mira y te respondemos en 72 h. Se pide una sola vez.", "Tell us what the photo shows and why it is fine. A person on the team looks at it and we answer within 72 h. You can ask once.") }
        : { type: "sec", t: E2("Apelar", "Appeal"), s: E2("Cuéntanos por qué crees que es un error. Otra persona del equipo, no quien lo decidió, lo revisa en 72 h. Se apela una sola vez.", "Tell us why you think it is a mistake. Another person on the team, not the one who decided, reviews it within 72 h. You can appeal once.") });
      B.push({ type: "form", fields: [{ k: fr ? E2("POR QUÉ ESTÁ BIEN", "WHY IT IS FINE") : E2("POR QUÉ ES UN ERROR", "WHY IT IS A MISTAKE"), v: txt, onV: (v) => { setTxt(v.slice(0, MAX_APELACION)); if (err) setErr(null); }, ta: true, max: MAX_APELACION,
        ph: fr ? E2("Por ejemplo: es la foto del mostrador de mi negocio.", "For example: it is the photo of my business counter.") : E2("Por ejemplo: era un aviso del barrio, no una venta.", "For example: it was a neighborhood notice, not a sale."), err: err ?? undefined, h: `${txt.trim().length}/${MAX_APELACION} · ${E2(`mínimo ${MIN_APELACION}`, `at least ${MIN_APELACION}`)}` }] });
      B.push({ type: "acts", btns: [[busy ? E2("Enviando…", "Sending…") : fr ? E2("Pedir revisión", "Ask for a review") : E2("Enviar apelación", "Send appeal"), "primary", "check", () => void enviar(), busy || txt.trim().length < MIN_APELACION]], cols: "minmax(0,260px)" });
    } else B.push({ type: "note", tone: "info", ic: "clock", s: E2("Ya pasaron los días para apelar.", "The time to appeal has passed.") });
    return <Marco es={es} code="USR-MODERACION" t={que(a)} s={s} yo={yo} ui={ui} back="/cuenta/moderacion" blocks={B} />;
  }

  const L = lista ?? { items: [], decididas: [] };
  const B: (Bloque | null | false)[] = [];
  if (!L.items.length && !L.decididas.length) B.push({ type: "empty", ic: "shield", t: E2("Nada por aquí", "Nothing here"), s: E2("Si To'Latino oculta algo tuyo o te sanciona, lo ves aquí con el motivo y puedes apelar.", "If To'Latino hides something of yours or sanctions you, you see it here with the reason and can appeal.") });
  const fotos = L.items.filter((a) => a.fotoRev), otros = L.items.filter((a) => !a.fotoRev);
  if (fotos.length) {
    B.push({ type: "sec", t: E2("Tus fotos sin publicar", "Your unpublished photos"), s: E2("Toca una para ver por qué y pedir que la revise una persona.", "Tap one to see why and ask a person to review it.") });
    B.push({ type: "rows", rows: fotos.map((a) => ({ key: `${a.k}${a.id}`, ph: a.foto, phIc: true, t: que(a), s: a.fotoRev?.motivo ? bi(a.fotoRev.motivo).toUpperCase() : dia(a.at).toUpperCase(),
      tag: a.apelacion ? (a.apelacion.estado === "open" ? [E2("UNA PERSONA LA VA A MIRAR", "A PERSON WILL LOOK"), "action"] : a.apelacion.estado === "lifted" ? [E2("PUBLICADA", "PUBLISHED"), "signal"] : [E2("SE MANTIENE", "STANDS"), "neutral"]) : estadoFoto(a),
      x: a.puedeApelar && !a.apelacion ? E2(`Puedes pedir revisión hasta el ${dia(a.vence)}.`, `You can ask for a review until ${dia(a.vence)}.`) : undefined,
      chev: true, on: () => router.push(`/cuenta/moderacion?k=${a.k}&id=${encodeURIComponent(a.id)}`) })) });
  }
  if (otros.length) {
    B.push({ type: "sec", t: E2("Lo que ocultamos o sancionamos", "What we hid or sanctioned"), s: E2("Toca uno para ver el motivo y apelar.", "Tap one to see the reason and appeal.") });
    B.push({ type: "rows", rows: otros.map((a) => ({ key: `${a.k}${a.id}`, ic: a.k === "sanction" ? "warning" : "shield", t: que(a), s: a.motivo ?? "",
      tag: a.apelacion ? (a.apelacion.estado === "open" ? [E2("APELACIÓN EN REVISIÓN", "APPEAL UNDER REVIEW"), "action"] : a.apelacion.estado === "lifted" ? [E2("LEVANTADA", "LIFTED"), "signal"] : [E2("SE MANTIENE", "STANDS"), "neutral"])
        : a.puedeApelar ? [E2(`APELA HASTA EL ${dia(a.vence).toUpperCase()}`, `APPEAL BY ${dia(a.vence).toUpperCase()}`), "danger"] : null,
      chev: true, on: () => router.push(`/cuenta/moderacion?k=${a.k}&id=${encodeURIComponent(a.id)}`) })) });
  }
  if (L.decididas.length) {
    B.push({ type: "sec", t: E2("Apelaciones decididas", "Decided appeals") });
    B.push({ type: "rows", rows: L.decididas.map((d) => ({ key: d.numero, ic: d.estado === "lifted" ? "check" : "shield", t: `${d.numero} · ${es ? APELABLE[d.k].es : APELABLE[d.k].en}`, s: d.decision,
      tag: d.estado === "lifted" ? [E2("LEVANTADA", "LIFTED"), "signal"] : [E2("SE MANTIENE", "STANDS"), "neutral"], x: dia(d.decidida) })) });
  }
  return <Marco es={es} code="USR-MODERACION" t={t} s={s} yo={yo} ui={ui} back="/cuenta" blocks={B} />;
}
