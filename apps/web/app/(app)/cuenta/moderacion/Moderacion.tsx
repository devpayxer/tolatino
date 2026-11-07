"use client";
/* 5d · Mi cuenta › Avisos de moderación (hueco #3; adm-data msgs0 «Recibimos tu apelación. Te respondemos en 72 h.»): el aviso
   («Ocultamos tu comentario: {motivo}») → «Apelar» (20–500 letras, una vez, 14 días) → «Recibimos tu apelación…» → el resultado
   (otra persona del equipo decide; es final). La lista junta lo oculto y las sanciones vivas, y las apelaciones ya decididas. Los
   bloques salen del marco de Mi cuenta (sección, nota, KV, formulario, acciones, filas). El servidor decide. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvisoMod, MisAvisos } from "@/lib/apelaciones";
import { APELABLE, MAX_APELACION, MIN_APELACION } from "@/lib/moderacion-comun";
import { apelarAccion } from "./acciones";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

export function Moderacion({ es, yo, uno, buscado, lista }: { es: boolean; yo: Yo; uno: AvisoMod | null; buscado: boolean; lista: MisAvisos | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [txt, setTxt] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const dia = (d: string) => new Date(d).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" });
  const que = (a: AvisoMod) => (es ? a.que.es : a.que.en);
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
      const r = await apelarAccion(a.k, a.id, x).catch(() => null); setBusy(false);
      if (!r || !r.ok) return setErr(r && "msg" in r ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
      ui.toast(E2("Recibimos tu apelación. Te respondemos en 72 h.", "We received your appeal. We will answer within 72 h.")); setTxt(""); router.refresh();
    };
    const B: (Bloque | null | false)[] = [
      { type: "note", tone: ap?.estado === "lifted" ? "ok" : "danger", ic: a.k === "sanction" ? "warning" : "shield", t: `${que(a)}${a.motivo ? `: ${a.motivo}` : ""}`,
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
    if (a.foto) B.push({ type: "rows", rows: [{ t: E2("La foto que quitamos", "The photo we removed"), ph: a.foto, ic: "image" }] });
    if (ap) {
      B.push({ type: "sec", t: E2(`Tu apelación · ${ap.numero}`, `Your appeal · ${ap.numero}`) });
      B.push(ap.estado === "open"
        ? { type: "note", tone: "info", ic: "clock", t: E2("Recibimos tu apelación. Te respondemos en 72 h.", "We received your appeal. We will answer within 72 h."), s: E2("La revisa otra persona del equipo, no quien lo decidió.", "Another person on the team reviews it, not the one who decided.") }
        : ap.estado === "lifted"
          ? { type: "note", tone: "ok", ic: "check", t: E2("Tenías razón: lo devolvimos.", "You were right: we restored it."), s: ap.decision ?? "" }
          : { type: "note", tone: "warn", ic: "shield", t: E2("Se mantiene la decisión. Esta revisión es final.", "The decision stands. This review is final."), s: ap.decision ?? "" });
      B.push({ type: "kv", rows: [{ k: E2("LO QUE ESCRIBISTE", "WHAT YOU WROTE"), v: ap.texto }, { k: E2("ENVIADA", "SENT"), v: dia(ap.at) }, ...(ap.decidida ? [{ k: E2("DECIDIDA", "DECIDED"), v: dia(ap.decidida) }] : [])] });
    } else if (a.puedeApelar) {
      B.push({ type: "sec", t: E2("Apelar", "Appeal"), s: E2("Cuéntanos por qué crees que es un error. Otra persona del equipo, no quien lo decidió, lo revisa en 72 h. Se apela una sola vez.", "Tell us why you think it is a mistake. Another person on the team, not the one who decided, reviews it within 72 h. You can appeal once.") });
      B.push({ type: "form", fields: [{ k: E2("POR QUÉ ES UN ERROR", "WHY IT IS A MISTAKE"), v: txt, onV: (v) => { setTxt(v.slice(0, MAX_APELACION)); if (err) setErr(null); }, ta: true, max: MAX_APELACION,
        ph: E2("Por ejemplo: era un aviso del barrio, no una venta.", "For example: it was a neighborhood notice, not a sale."), err: err ?? undefined, h: `${txt.trim().length}/${MAX_APELACION} · ${E2(`mínimo ${MIN_APELACION}`, `at least ${MIN_APELACION}`)}` }] });
      B.push({ type: "acts", btns: [[busy ? E2("Enviando…", "Sending…") : E2("Enviar apelación", "Send appeal"), "primary", "check", () => void enviar(), busy || txt.trim().length < MIN_APELACION]], cols: "minmax(0,260px)" });
    } else B.push({ type: "note", tone: "info", ic: "clock", s: E2("Ya pasaron los días para apelar.", "The time to appeal has passed.") });
    return <Marco es={es} code="USR-MODERACION" t={que(a)} s={s} yo={yo} ui={ui} back="/cuenta/moderacion" blocks={B} />;
  }

  const L = lista ?? { items: [], decididas: [] };
  const B: (Bloque | null | false)[] = [];
  if (!L.items.length && !L.decididas.length) B.push({ type: "empty", ic: "shield", t: E2("Nada por aquí", "Nothing here"), s: E2("Si To'Latino oculta algo tuyo o te sanciona, lo ves aquí con el motivo y puedes apelar.", "If To'Latino hides something of yours or sanctions you, you see it here with the reason and can appeal.") });
  if (L.items.length) {
    B.push({ type: "sec", t: E2("Lo que ocultamos o sancionamos", "What we hid or sanctioned"), s: E2("Toca uno para ver el motivo y apelar.", "Tap one to see the reason and appeal.") });
    B.push({ type: "rows", rows: L.items.map((a) => ({ key: `${a.k}${a.id}`, ic: a.k === "sanction" ? "warning" : "shield", t: que(a), s: a.motivo ?? "",
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
