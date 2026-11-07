"use client";
/* APP-COM-POST · el hilo (prototipo postV · Thread 2r): la que le sirvió a quien preguntó o la más votada destacada (TopAnswer 17d,
   «LE SIRVIÓ A …» / «MÁS VOTADA · N VOTOS» con el negocio en grande y «Ver»); los negocios recomendados con su barra de % y el voto
   (AlsoRecommended 17c, «También recomiendan» si la destacada ya trae negocio); cada comentario en su tarjeta (CommentCard 17a) con
   sus respuestas en «Ver N respuestas» (ReplyThread 18a; una respuesta a otra va un nivel abajo con «@Nombre»). Recomendar un negocio
   en el comentario (si ya está en el hilo: «Sumar mi voto»). Escribir: en escritorio en el mismo hilo (Esc cancela, Ctrl + Enter
   envía); en el teléfono, la barra de abajo. Votos ± (comentarios) y + (respuestas); «Me sirvió» solo para quien preguntó.
   El servidor decide y cuenta todo (votos, %, quién puede qué); aquí solo se muestra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { MAX_COMENTARIO } from "@/lib/comunidad-filtro";
import { hace, rango, type Pub } from "@/lib/comunidad-comun";
import type { Cm, Hilo as H, NegocioCm, OrdenHilo, Rec } from "@/lib/comunidad-hilo";
import { MONO, type ComUi, type YoCom } from "../../Marco";
import { comBorrarCm, comComentar, comHilo, comMeSirvio, comNegocios, comRespuestas, comVotarCm, comReportar } from "../../acciones";
import { YA_NO_LO_VES, abrirReporte } from "../../Reportar";
import { LINEA988 } from "@/lib/moderacion-comun";
import { useVecinoAcciones } from "../../vecinoAcciones";

type N = "Icon" | "Button" | "TopAnswer" | "CommentCard" | "ReplyThread" | "AlsoRecommended";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TopAnswer, CommentCard, ReplyThread, AlsoRecommended } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
type R = { ok: boolean; msg?: Bi; entrar?: boolean };
type Resp = { items: Cm[]; mas: string | null; abierta: boolean };
type Destino = { root: string; to: string | null; nombre: string } | null;
type Adjunto = { id: string; nombre: string; foto: string | null; meta: string } | null;
const fondo = (u: string | null) => (u ? `url("${u}")` : undefined);
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function Hilo({ es, yo, pub, h0, orden, ui, D }: { es: boolean; yo: YoCom; pub: Pub; h0: H; orden: OrdenHilo; ui: ComUi; D: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [h, setH] = useState(h0), [extra, setExtra] = useState<Cm[]>([]), [mas, setMas] = useState(h0.mas);
  const [resp, setResp] = useState<Record<string, Resp>>({});
  const [dest, setDest] = useState<Destino>(null), [txt, setTxt] = useState(""), [rTxt, setRTxt] = useState(""), [att, setAtt] = useState<Adjunto>(null);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { setH(h0); setExtra([]); setMas(h0.mas); }, [h0]);
  const red: R = { ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } };
  const fallo = (r: R) => { if (r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`); return; } if (r.msg) ui.setAviso({ t: es ? r.msg.es : r.msg.en }); };
  const correr = async <T extends R>(fn: () => Promise<T>) => { if (busy) return null; setBusy(true); try { return await fn().catch(() => red as T); } finally { setBusy(false); } };

  /* Un comentario cambió (voto): en la destacada, en las raíces, en las respuestas abiertas y en los recomendados. */
  const poner = (id: string, f: (c: Cm) => Cm) => {
    setH((x) => ({ ...x, destacada: x.destacada?.id === id ? f(x.destacada) : x.destacada, raices: x.raices.map((c) => (c.id === id ? f(c) : c)) }));
    setExtra((L) => L.map((c) => (c.id === id ? f(c) : c)));
    setResp((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, items: v.items.map((c) => (c.id === id ? f(c) : c)) }])));
  };
  const votar = async (c: Cm, v: 1 | -1) => {
    if (c.mia) return ui.setAviso({ t: E2("Lo tuyo lo votan los demás.", "Others vote on yours.") });
    const r = await correr(() => comVotarCm(c.id, v)); if (!r) return;
    if (!r.ok || !("score" in r)) return fallo(r);
    poner(c.id, (x) => ({ ...x, score: r.score, up: r.up, miVoto: r.miVoto }));
    if (c.negocio) router.refresh(); // los % de los recomendados los recalcula el servidor
  };
  const votarRec = async (b: Rec) => {
    if (b.mia) return ui.setAviso({ t: E2("Esta la recomendaste tú.", "You recommended this one.") });
    const r = await correr(() => comVotarCm(b.comentario, 1)); if (!r) return;
    if (!r.ok || !("score" in r)) return fallo(r);
    ui.setAviso({ t: r.miVoto === 1 ? E2(`Sumaste tu voto a ${b.negocio.nombre}.`, `You added your vote to ${b.negocio.nombre}.`) : E2(`Quitaste tu voto a ${b.negocio.nombre}.`, `You removed your vote from ${b.negocio.nombre}.`) });
    poner(b.comentario, (x) => ({ ...x, score: r.score, up: r.up, miVoto: r.miVoto }));
    router.refresh();
  };
  const abrir = async (root: string, forzar = false) => {
    const ya = resp[root];
    if (ya && !forzar) return setResp((m) => ({ ...m, [root]: { ...ya, abierta: !ya.abierta } }));
    const r = await comRespuestas(root, null).catch(() => red);
    if (!r.ok || !("items" in r)) return fallo(r);
    setResp((m) => ({ ...m, [root]: { items: r.items, mas: r.mas, abierta: true } }));
  };
  const masResp = async (root: string) => {
    const ya = resp[root]; if (!ya?.mas) return;
    const r = await comRespuestas(root, ya.mas).catch(() => red);
    if (!r.ok || !("items" in r)) return fallo(r);
    setResp((m) => ({ ...m, [root]: { items: [...ya.items, ...r.items], mas: r.mas, abierta: true } }));
  };
  const masRaices = async () => {
    if (!mas) return;
    const r = await correr(() => comHilo(pub.id, orden, mas)); if (!r) return;
    if (!r.ok || !("h" in r)) return fallo(r);
    setExtra((L) => [...L, ...r.h.raices.filter((c) => !L.some((x) => x.id === c.id))]); setMas(r.h.mas);
  };

  /* Escribir. */
  const responder = (root: Cm, a: Cm | null) => {
    if (h.cerrados) return;
    const n = (a ?? root).autor.nombre, pre = a ? `@${primero(a.autor.nombre)} ` : "";
    setDest({ root: root.id, to: a?.id ?? null, nombre: n });
    if (D) setRTxt(pre); else { setTxt(pre); setTimeout(() => area.current?.focus(), 30); }
  };
  const cancelar = () => { setDest(null); setRTxt(""); setAtt(null); };
  const enviar = async (modo: "main" | "inline") => {
    const t = (modo === "inline" ? rTxt : txt).trim(), d = modo === "main" && D ? null : dest;
    if (!t && !att) return;
    const r = await correr(() => comComentar(pub.id, { body: t, business: att?.id ?? null, parent: d?.root ?? null, replyTo: d?.to ?? null })); if (!r) return;
    if (!r.ok) return fallo(r);
    if (modo === "inline") setRTxt(""); else setTxt("");
    setAtt(null); setDest(null);
    // 5d · Si el texto habla de hacerse daño, la línea del 988 (sin juzgar; el comentario se publicó).
    ui.setAviso("crisis" in r && r.crisis ? { t: es ? LINEA988.es : LINEA988.en, ms: 14000 } : { t: d ? E2("Respuesta publicada.", "Reply posted.") : E2("Comentario publicado.", "Comment posted.") });
    if (d) await abrir(d.root, true);
    router.refresh();
  };
  const tecla = (modo: "main" | "inline") => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && modo === "inline") { e.preventDefault(); cancelar(); }
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void enviar(modo); }
  };
  const elegirNegocio = () => ui.setHoja({ title: E2("Recomienda un negocio", "Recommend a business"), extra: <BuscaNegocio es={es} onPick={(b) => elegido(b)} /> });
  const elegido = (b: NegocioCm & { metaT: string }) => {
    const dup = h.recsTodos.find((x) => x.negocio.id === b.id);
    if (!dup) { setAtt({ id: b.id, nombre: b.nombre, foto: b.foto, meta: b.metaT }); ui.setHoja(null); if (!D) setTimeout(() => area.current?.focus(), 30); return; }
    ui.setHoja({ title: E2("Recomienda un negocio", "Recommend a business"), extra: (
      <div data-screen-label="Comentario · ya lo recomendaron" style={{ marginTop: 14 }}>
        <div style={{ padding: 14, borderRadius: 14, background: "var(--tl-paper)" }}>
          <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "var(--tl-action)" }}>{E2("YA LO RECOMENDARON AQUÍ", "ALREADY RECOMMENDED HERE")}</div>
          <div style={{ marginTop: 6, font: "800 16px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{b.nombre}</div>
          <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>
            {dup.mia ? E2("Tú ya lo recomendaste en este hilo.", "You already recommended it in this thread.")
              : E2(`${dup.quien} ya lo recomendó en este hilo y ${dup.votos} ${dup.votos === 1 ? "vecino lo votó" : "vecinos lo votaron"}. Sumar tu voto lo sube, sin repetirlo.`, `${dup.quien} already recommended it here and ${dup.votos} ${dup.votos === 1 ? "neighbor voted" : "neighbors voted"}. Your vote lifts it without repeating.`)}
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {!dup.mia && <div style={{ display: "flex" }}><Button variant="primary" block disabled={dup.miVoto === 1} onClick={() => { ui.setHoja(null); void votarRec(dup); }}>{dup.miVoto === 1 ? E2("Ya sumaste tu voto", "You already added your vote") : E2("Sumar mi voto", "Add my vote")}</Button></div>}
          <div style={{ display: "flex" }}><Button variant="secondary" block onClick={() => { setAtt({ id: b.id, nombre: b.nombre, foto: b.foto, meta: b.metaT }); ui.setHoja(null); }}>{E2("Recomendarlo con mi comentario", "Recommend it in my comment")}</Button></div>
        </div>
      </div>) });
  };

  /* Menú de un comentario: borrar el propio; cambiar la que le sirvió (quien preguntó); (5c) ver el perfil, silenciar o bloquear a quien lo escribió. */
  const vec = useVecinoAcciones(es, ui);
  const menu = (c: Cm, raiz: boolean) => {
    const rows: { t: string; s?: string; ic?: string; peligro?: boolean; sep?: boolean; on: () => void }[] = [];
    if (c.mia) rows.push({ t: E2("Borrar comentario", "Delete comment"), s: E2("Deja de verse en el hilo.", "It stops showing in the thread."), ic: "trash", peligro: true, on: () => ui.setHoja({ title: E2("¿Borrar este comentario?", "Delete this comment?"), sub: E2("Si tiene respuestas, queda «Comentario eliminado».", "If it has replies, it shows as «Comment deleted»."), yes: E2("Borrar", "Delete"), peligro: true, onYes: () => void borrarCm(c) }) });
    if (raiz && h.puedeMarcar && h.resuelta && !c.mejor && !c.mia && c.estado === "visible") rows.push({ t: E2("Esta me sirvió más", "This one helped me more"), s: E2("Pasa a ser la respuesta que te sirvió.", "It becomes the answer that helped you."), ic: "check", on: () => { ui.setHoja(null); void sirvio(c); } });
    if (!c.mia && c.autor.id) rows.push(...vec.filas(c.autor.id, c.autor.nombre, () => router.refresh()));
    // 5d · Reportar el comentario: deja de verse para quien reporta y va a la cola de To'Latino.
    if (!c.mia && c.estado === "visible") rows.push({ t: E2("Reportar comentario", "Report comment"), s: E2("Ya no lo verás. Lo revisamos en 48 h.", "You won't see it anymore. We review it within 48 h."), ic: "warning", peligro: true, sep: true,
      on: () => abrirReporte(ui, es, { enviar: (m, n) => comReportar("comment", c.id, m, n), despues: YA_NO_LO_VES, alEnviado: () => router.refresh() }) });
    if (rows.length) ui.setHoja({ title: c.mia ? E2("Tu comentario", "Your comment") : E2(`Comentario de ${c.autor.nombre}`, `Comment by ${c.autor.nombre}`), rows });
  };
  const borrarCm = async (c: Cm) => { const r = await correr(() => comBorrarCm(c.id)); if (!r) return; if (!r.ok) return fallo(r); ui.setAviso({ t: E2("Comentario borrado.", "Comment deleted.") }); router.refresh(); };
  const sirvio = async (c: Cm) => {
    const r = await correr(() => comMeSirvio(pub.id, c.id)); if (!r) return;
    if (!r.ok) return fallo(r);
    ui.setAviso({ t: E2(`Marcaste que te sirvió. Le avisamos a ${c.autor.nombre}.`, `Marked as helpful. We let ${c.autor.nombre} know.`) });
    router.refresh();
  };

  /* Lo que el sistema de diseño necesita de cada comentario. */
  const quien = (c: Cm) => ({
    avatar: fondo(c.autor.foto), avatarColor: "var(--tl-desk)", initials: c.autor.foto ? undefined : c.autor.ini, name: c.mia ? `${c.autor.nombre}${E2(" · tú", " · you")}` : c.autor.nombre,
    rank: c.autor.rango >= 4 ? { label: (es ? rango(c.autor.rango).es : rango(c.autor.rango).en).toUpperCase(), tone: c.autor.rango >= 9 ? "ink" : "neutral" } : null,
  });
  const voto = (c: Cm) => ({ score: String(c.score), onUp: () => void votar(c, 1), onDown: () => void votar(c, -1), upColor: c.miVoto === 1 ? "var(--tl-action)" : undefined, downColor: c.miVoto === -1 ? "var(--tl-danger)" : undefined, scoreColor: c.miVoto ? "var(--tl-action)" : "var(--tl-ink)" });
  const acciones = (c: Cm) => ({
    vote: voto(c), replyLabel: E2("Responder", "Reply"), onReply: h.cerrados ? undefined : () => responder(c, null),
    solve: h.puedeMarcar && !h.resuelta && !c.mia && c.estado === "visible" ? { label: E2("Me sirvió", "Helped me"), onClick: () => void sirvio(c) } : null,
    onMenu: c.estado === "visible" || c.mia ? () => menu(c, true) : undefined, menuLabel: E2("Opciones del comentario", "Comment options"),
  });
  const respuesta = (root: Cm, r: Cm, kids?: Cm[], cont?: boolean): Record<string, unknown> => {
    const m = /^(@\S+)\s*([\s\S]*)$/.exec(r.body);
    return {
      key: r.id, ...quien(r), time: hace(r.at, es), hasText: !!r.body.trim() || !!r.replyTo, at: m ? m[1] : r.replyTo ? `@${primero(r.replyTo.nombre)}` : "", text: m ? m[2] : r.body,
      business: r.negocio ? { name: r.negocio.nombre, meta: es ? r.negocio.meta.es : r.negocio.meta.en, verified: r.negocio.verificado, image: r.negocio.foto ?? undefined, onClick: () => router.push(`/n/${r.negocio!.id}`) } : null,
      vote: { score: String(r.up), onUp: () => void votar(r, 1), upColor: r.miVoto === 1 ? "var(--tl-action)" : undefined, scoreColor: r.miVoto === 1 ? "var(--tl-action)" : undefined },
      replyLabel: E2("Responder", "Reply"), onReply: h.cerrados ? undefined : () => responder(root, r), onMenu: () => menu(r, false), menuLabel: E2("Opciones de la respuesta", "Reply options"),
      line: !!kids?.length, cont: !!cont, kids: (kids ?? []).map((k, j) => respuesta(root, k, undefined, j < (kids?.length ?? 0) - 1)),
    };
  };
  const hiloDe = (c: Cm) => {
    const st = resp[c.id], n = st ? st.items.length : c.respuestas;
    if (!n) return null;
    // Cabezas (contestan a la raíz) y, debajo, las que contestan a alguien de esa cabeza.
    const cab = new Map<string, string>(), grupos: { c: Cm; kids: Cm[] }[] = [];
    for (const r of st?.items ?? []) {
      const h0 = r.replyTo ? cab.get(r.replyTo.id) : undefined;
      const g = h0 ? grupos.find((x) => x.c.id === h0) : undefined;
      if (g) { g.kids.push(r); cab.set(r.id, g.c.id); } else { grupos.push({ c: r, kids: [] }); cab.set(r.id, r.id); }
    }
    return (
      <>
        <ReplyThread open={!!st?.abierta} onToggle={() => void abrir(c.id)} faces={c.caras.map((f) => ({ image: fondo(f.foto), initials: f.foto ? "" : f.ini }))}
          toggleLabel={st?.abierta ? E2("Ocultar respuestas", "Hide replies") : E2(`Ver ${n} ${n === 1 ? "respuesta" : "respuestas"}`, `See ${n} ${n === 1 ? "reply" : "replies"}`)}
          replies={grupos.map((g) => respuesta(c, g.c, g.kids))} />
        {st?.abierta && st.mas && <div style={{ marginTop: 10 }}><span role="button" onClick={() => void masResp(c.id)} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Ver más respuestas", "See more replies")}</span></div>}
      </>);
  };
  const adjunto = (onX: () => void) => att && (
    <div style={{ marginBottom: 8, padding: "7px 9px", borderRadius: 12, background: "var(--tl-white)", border: "1px solid rgba(75,55,245,.3)", display: "flex", gap: 9, alignItems: "center" }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: fondo(att.foto), backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 12.5px Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{att.nombre}</div><div style={{ marginTop: 2, font: `600 8.5px ${MONO}`, letterSpacing: ".06em", color: "var(--tl-action)" }}>{E2("RECOMIENDAS ESTE NEGOCIO", "YOU RECOMMEND THIS BUSINESS")}</div></div>
      <span role="button" aria-label={E2("Quitar el negocio", "Remove the business")} onClick={onX} style={{ display: "grid", cursor: "pointer", padding: 4 }}><Icon name="close" size={14} color="var(--tl-ink)" /></span>
    </div>);
  const botonNegocio = (
    <span role="button" onClick={elegirNegocio} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 10, background: "rgba(75,55,245,.08)", font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>
      <Icon name="store" size={15} color="var(--tl-action)" />{E2("Recomendar un negocio", "Recommend a business")}</span>);
  const yoAv = <span style={{ width: 28, height: 28, borderRadius: 99, background: fondo(yo.foto), backgroundSize: "cover", backgroundColor: "var(--tl-desk)", display: "grid", placeItems: "center", font: "800 10px Sora,sans-serif", flex: "none" }}>{yo.foto ? "" : yo.ini}</span>;
  /* Responder aquí (escritorio): la cajita bajo el comentario. */
  const cajita = (c: Cm): ReactNode => D && dest?.root === c.id ? (
    <div data-screen-label="Comentario · responder aquí" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 14, background: "var(--tl-paper)", border: "1.5px solid var(--tl-action)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>{yoAv}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 11.5px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)", marginBottom: 6 }}>{E2(`Respondiendo a ${dest.nombre}`, `Replying to ${dest.nombre}`)}</div>
          {adjunto(() => setAtt(null))}
          <textarea autoFocus aria-label={E2("Tu respuesta", "Your reply")} value={rTxt} maxLength={MAX_COMENTARIO} onChange={(e) => setRTxt(e.target.value)} onKeyDown={tecla("inline")} placeholder={E2("Escribe tu respuesta…", "Write your reply…")} rows={2}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 56, padding: 0, border: "none", outline: "none", resize: "none", background: "transparent", font: "500 14px/1.5 Manrope,sans-serif", color: "var(--tl-ink)" }} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{botonNegocio}<span style={{ flex: 1 }} />
            <span style={{ font: `600 9px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.42)" }}>{E2("ESC CANCELA", "ESC CANCELS")}</span>
            <Button variant="secondary" size="sm" onClick={cancelar}>{E2("Cancelar", "Cancel")}</Button>
            <Button variant="primary" size="sm" disabled={busy || !(rTxt.trim() || att)} onClick={() => void enviar("inline")}>{E2("Responder", "Reply")}</Button></div>
        </div></div>
    </div>) : null;

  const tarjeta = (c: Cm) => c.estado !== "visible" ? (
    <div key={c.id} id={`c${c.id}`} data-screen-label="Publicación · comentario eliminado" style={{ borderRadius: 18, background: "var(--tl-paper)", border: "1px solid rgba(11,14,18,.08)", padding: "14px 16px 12px" }}>
      <div style={{ font: "600 13px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{c.estado === "hidden" ? E2("Comentario oculto por las reglas del barrio", "Comment hidden under the neighborhood rules") : E2("Comentario eliminado", "Comment deleted")}</div>
      {hiloDe(c)}
    </div>) : (
    <div key={c.id} id={`c${c.id}`}>
      <CommentCard screenLabel="Publicación · comentario" bg={c.mia ? "rgba(75,55,245,.03)" : "var(--tl-white)"} {...quien(c)} time={hace(c.at, es).toUpperCase()}
        best={c.mejor ? E2(`LE SIRVIÓ A ${primero(pub.autor.nombre).toUpperCase()}`, `HELPED ${primero(pub.autor.nombre).toUpperCase()}`) : undefined} body={c.body || undefined}
        business={c.negocio ? { name: c.negocio.nombre, meta: es ? c.negocio.meta.es : c.negocio.meta.en, verified: c.negocio.verificado, image: c.negocio.foto ?? undefined, onClick: () => router.push(`/n/${c.negocio!.id}`) } : null}
        actions={acciones(c)}>
        {cajita(c)}{hiloDe(c)}
      </CommentCard>
    </div>);

  const T = h.destacada, raices = [...h.raices, ...extra], n = pub.comentarios;
  const kick = T ? `${h.kicker === "mejor" ? E2(`LE SIRVIÓ A ${primero(pub.autor.nombre).toUpperCase()}`, `HELPED ${primero(pub.autor.nombre).toUpperCase()}`) : E2("MÁS VOTADA", "TOP VOTED")} · ${T.up} ${E2(T.up === 1 ? "VOTO" : "VOTOS", T.up === 1 ? "VOTE" : "VOTES")}` : "";
  const ph = pub.kind === "pregunta" ? E2("¿Conoces a alguien? Recomiéndalo o cuenta tu experiencia…", "Know someone? Recommend them or share your experience…") : E2("Escribe un comentario…", "Write a comment…");
  const puedeEnviar = !!(txt.trim() || att);
  return (
    <div data-screen-label="Publicación · hilo" style={{ display: "flex", flexDirection: "column", gap: 12, padding: D ? 0 : "12px 16px 0" }}>
      {T && (
        <div id={`c${T.id}`}>
          <TopAnswer screenLabel="Publicación · la más votada" kicker={kick} {...quien(T)} time={hace(T.at, es).toUpperCase()} body={T.body || undefined}
            business={T.negocio ? { name: T.negocio.nombre, image: fondo(T.negocio.foto), verified: T.negocio.verificado, meta: es ? T.negocio.meta.es : T.negocio.meta.en, cta: E2("Ver", "View"), onOpen: () => router.push(`/n/${T.negocio!.id}`) } : null}
            actions={acciones(T)}>
            {cajita(T)}{hiloDe(T)}
          </TopAnswer>
        </div>
      )}
      {h.recs.length > 0 && (
        <AlsoRecommended screenLabel="Publicación · recomendados" title={T?.negocio ? E2("También recomiendan", "Also recommended") : E2("Recomendados en este hilo", "Recommended in this thread")}
          sub={E2("POR VOTOS DE VECINOS · VOTA SI TÚ TAMBIÉN LO RECOMIENDAS", "BY NEIGHBOR VOTES · VOTE IF YOU RECOMMEND IT TOO")}
          items={h.recs.map((b) => ({ name: b.negocio.nombre, meta: (es ? b.negocio.meta.es : b.negocio.meta.en) || E2(`${b.recomiendan} ${b.recomiendan === 1 ? "VECINO LO RECOMIENDA" : "VECINOS LO RECOMIENDAN"}`, `${b.recomiendan} ${b.recomiendan === 1 ? "NEIGHBOR RECOMMENDS IT" : "NEIGHBORS RECOMMEND IT"}`), image: fondo(b.negocio.foto), pct: `${b.pct}%`, count: String(b.votos),
            border: b.miVoto === 1 ? "var(--tl-action)" : undefined, color: b.miVoto === 1 || b.mia ? "var(--tl-action)" : "var(--tl-ink)", onOpen: () => router.push(`/n/${b.negocio.id}`), onVote: () => void votarRec(b) }))} />
      )}
      <div data-screen-label="Publicación · comentarios" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 2px" }}>
          <span style={{ flex: 1, minWidth: 0, font: "800 16px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{n ? E2(`${n} ${n === 1 ? "comentario" : "comentarios"}`, `${n} ${n === 1 ? "comment" : "comments"}`) : E2("Comentarios", "Comments")}</span>
          <div role="group" aria-label={E2("Orden de los comentarios", "Comment order")} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 11, background: "rgba(11,14,18,.06)", flex: "none" }}>
            {([["top", "Más votados", "Top"], ["new", "Recientes", "Newest"]] as const).map(([k, a, b]) => (
              <span key={k} role="button" aria-pressed={orden === k} onClick={() => router.replace(`/comunidad/p/${pub.id}${k === "new" ? "?o=new" : ""}`, { scroll: false })}
                style={{ padding: "5px 10px", borderRadius: 8, background: orden === k ? "var(--tl-white)" : "transparent", color: orden === k ? "var(--tl-ink)" : "rgba(11,14,18,.55)", font: "700 11px Manrope,sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>{es ? a : b}</span>))}
          </div>
        </div>
        {D && !h.cerrados && (
          <div data-screen-label="Publicación · comentar desktop" style={{ borderRadius: 18, background: "var(--tl-white)", border: `1.5px solid ${txt.trim() || (att && !dest) ? "var(--tl-action)" : "rgba(11,14,18,.08)"}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 36, height: 36, borderRadius: 99, background: fondo(yo.foto), backgroundSize: "cover", backgroundColor: "var(--tl-desk)", display: "grid", placeItems: "center", font: "800 12px Sora,sans-serif", flex: "none" }}>{yo.foto ? "" : yo.ini}</span>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                {!dest && adjunto(() => setAtt(null))}
                <textarea aria-label={E2("Tu comentario", "Your comment")} value={txt} maxLength={MAX_COMENTARIO} onChange={(e) => setTxt(e.target.value)} onKeyDown={tecla("main")} placeholder={ph} rows={2}
                  style={{ width: "100%", boxSizing: "border-box", minHeight: 52, padding: "6px 0 0", border: "none", outline: "none", resize: "none", background: "transparent", font: "500 14.5px/1.5 Manrope,sans-serif", color: "var(--tl-ink)" }} />
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{botonNegocio}<span style={{ flex: 1 }} />
                  <span style={{ font: `600 9px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.42)" }}>{E2("CTRL + ENTER PARA ENVIAR", "CTRL + ENTER TO SEND")}</span>
                  <Button variant="primary" size="sm" disabled={busy || !(txt.trim() || (att && !dest))} onClick={() => void enviar("main")}>{E2("Comentar", "Comment")}</Button></div>
              </div>
            </div>
          </div>
        )}
        {h.cerrados && <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--tl-paper)", font: "600 13px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2("Los comentarios de esta publicación están cerrados.", "Comments on this post are closed.")}</div>}
        {!raices.length && !T ? (
          <div style={{ padding: "8px 4px" }}>
            <div style={{ font: "700 14px/1.35 Manrope,sans-serif" }}>{pub.kind === "pregunta" ? E2("Nadie ha respondido todavía", "No answers yet") : E2("Sin comentarios todavía", "No comments yet")}</div>
            <div style={{ marginTop: 4, font: "500 13px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{pub.kind === "pregunta" ? E2("Si conoces a alguien, recomiéndalo con el botón de negocio.", "If you know someone, recommend them with the business button.") : E2("Sé el primero en comentar.", "Be the first to comment.")}</div>
          </div>
        ) : raices.map(tarjeta)}
        {mas && <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}><Button variant="secondary" size="md" disabled={busy} onClick={() => void masRaices()}>{E2("Ver más comentarios", "See more comments")}</Button></div>}
      </div>
      {!D && !h.cerrados && (
        <div data-screen-label="Publicación · comentar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "10px 14px 26px" }}>
          {dest && <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, font: "600 12px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}><span style={{ flex: 1, minWidth: 0 }}>{E2(`Respondiendo a ${dest.nombre}`, `Replying to ${dest.nombre}`)}</span><span role="button" aria-label={E2("No responder", "Don't reply")} onClick={() => { setDest(null); setTxt(""); }} style={{ display: "grid", cursor: "pointer" }}><Icon name="close" size={14} /></span></div>}
          {adjunto(() => setAtt(null))}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <span role="button" aria-label={E2("Recomendar un negocio", "Recommend a business")} onClick={elegirNegocio} style={{ width: 42, height: 42, boxSizing: "border-box", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", background: "var(--tl-white)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="store" size={18} color="var(--tl-action)" /></span>
            <textarea ref={area} aria-label={dest ? E2("Tu respuesta", "Your reply") : E2("Tu comentario", "Your comment")} value={txt} maxLength={MAX_COMENTARIO} onChange={(e) => setTxt(e.target.value)} rows={1} placeholder={dest ? E2("Tu respuesta…", "Your reply…") : pub.kind === "pregunta" ? E2("Recomienda a alguien…", "Recommend someone…") : E2("Escribe un comentario…", "Write a comment…")}
              style={{ flex: 1, minWidth: 0, minHeight: 42, maxHeight: 120, boxSizing: "border-box", padding: "10px 14px", borderRadius: 14, border: "1px solid rgba(11,14,18,.12)", background: "var(--tl-white)", outline: "none", resize: "none", font: "500 14.5px/1.4 Manrope,sans-serif", color: "var(--tl-ink)" }} />
            <span role="button" aria-label={dest ? E2("Responder", "Reply") : E2("Comentar", "Comment")} aria-disabled={!puedeEnviar || busy || undefined} onClick={() => { if (puedeEnviar && !busy) void enviar("main"); }}
              style={{ width: 42, height: 42, borderRadius: 13, background: puedeEnviar ? "var(--tl-ink)" : "rgba(11,14,18,.22)", display: "grid", placeItems: "center", cursor: puedeEnviar ? "pointer" : "default", flex: "none" }}><Icon name="right" size={18} strokeWidth={2} color="var(--tl-white)" /></span>
          </div>
        </div>
      )}
    </div>
  );
}

/* Buscar un negocio de la ciudad para recomendarlo en el comentario (la hoja «Recomienda un negocio»). */
function BuscaNegocio({ es, onPick }: { es: boolean; onPick: (b: NegocioCm & { metaT: string }) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [q, setQ] = useState(""), [L, setL] = useState<{ id: string; nombre: string; meta: Bi; foto: string | null; verificado: boolean }[]>([]), [listo, setListo] = useState(false);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setL([]); setListo(false); return; }
    const x = setTimeout(async () => { const r = await comNegocios(t).catch(() => ({ ok: true as const, items: [] })); setL(r.items); setListo(true); }, 250);
    return () => clearTimeout(x);
  }, [q]);
  return (
    <div data-screen-label="Comentario · buscar negocio" style={{ marginTop: 14 }}>
      <input autoFocus aria-label={E2("Buscar negocio", "Search business")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={E2("Nombre o qué hace: sastre, pan, frenos…", "Name or what they do: tailor, bread, brakes…")}
        style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      <div role="listbox" aria-label={E2("Negocios", "Businesses")} style={{ marginTop: 10 }}>
        {L.map((b, i) => (
          <div key={b.id} role="option" aria-selected={false} onClick={() => onPick({ ...b, metaT: es ? b.meta.es : b.meta.en })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 2px", borderTop: i ? "1px solid rgba(11,14,18,.07)" : "none", cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: fondo(b.foto), backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{b.nombre}</div><div style={{ marginTop: 3, font: `600 9.5px/1.4 ${MONO}`, color: "rgba(11,14,18,.5)" }}>{(es ? b.meta.es : b.meta.en).toUpperCase()}</div></div>
          </div>))}
        {listo && !L.length && <div style={{ padding: "10px 2px", font: "500 13px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("No lo encontramos en tu ciudad. Si todavía no está, invítalo a publicar gratis.", "Not found in your city. If they are not listed yet, invite them to list for free.")}</div>}
      </div>
    </div>
  );
}
