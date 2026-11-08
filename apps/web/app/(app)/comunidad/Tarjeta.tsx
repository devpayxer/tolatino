"use client";
/* Una publicación de la Comunidad como PostCard del sistema (MEM 92: encabezado 2c Honor, contenido 3b Papel, barra 4c Pastillas):
   rango con escudo desde Sargento (gris 4–8, dorado 9–10), barrio o «Invitado · de …», hora a la derecha, menú; lo propio de cada
   tipo debajo del texto (fotos, el negocio recomendado, la encuesta) y el aviso del 911 sobre tinte rojo en Salud. Votos ±,
   comentarios, guardar y compartir. El servidor decide todo; aquí solo se muestra. */
import * as UI from "@tolatino/ui";
import { useState, type ComponentType } from "react";
import { LINEA911 } from "@/lib/comunidad-filtro";
import { hace, rango, type Pub } from "@/lib/comunidad-comun";
import { Avatar, MONO } from "./Marco";
import type { Tr } from "../Traducir";

type N = "Icon" | "PostCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, PostCard } = UI as unknown as Record<N, ComponentType<any>>;
type Fn = () => void;

const dias = (iso: string, es: boolean) => {
  const h = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (h <= 0) return es ? "CERRADA" : "CLOSED";
  return h >= 24 ? (es ? `CIERRA EN ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "DÍA" : "DÍAS"}` : `CLOSES IN ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "DAY" : "DAYS"}`)
    : (es ? `CIERRA EN ${Math.max(1, Math.round(h))} H` : `CLOSES IN ${Math.max(1, Math.round(h))} H`);
};

export function Tarjeta({ p, es, full, tr, onOpen, onMenu, onVote, onPoll, onSave, onShare, onBiz, onAuthor }: {
  p: Pub; es: boolean; full?: boolean; tr?: Tr; onOpen?: Fn; onMenu?: Fn; onVote: (v: 1 | -1) => void; onPoll: (i: number) => void; onSave: Fn; onShare: Fn; onBiz: (id: string) => void; onAuthor?: Fn;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [ix, setIx] = useState(0);
  const a = p.autor, rk = a.oficial ? { label: E2("Cuenta oficial", "Official account"), shield: null } : a.rango >= 4 ? { label: es ? rango(a.rango).es : rango(a.rango).en, shield: a.rango >= 9 ? "gold" : "gray" } : null;
  const lugar = (es ? p.lugar.es : p.lugar.en) + (p.mi != null ? ` · ${p.mi} mi` : "");
  const enc = p.encuesta, ver = !!enc && enc.ver;
  // 5h · «Ver traducción» bajo el texto si está en el otro idioma (nunca en lo propio).
  const t = tr ? tr("com_post", p.id, p.lang, p.body, p.mia) : { body: p.body, translate: undefined };
  return (
    <PostCard screenLabel={full ? "APP-COM-POST · publicación" : "Comunidad · publicación"}
      pin={p.fijada ? (p.kind === "pregunta" ? E2("PREGUNTA DE LA SEMANA · FIJADA", "QUESTION OF THE WEEK · PINNED") : E2("FIJADA", "PINNED")) : undefined}
      avatar={a.foto ? `url("${a.foto}") center/cover` : undefined} avatarColor={a.oficial ? "var(--tl-ink)" : "var(--tl-desk)"}
      initials={a.foto ? undefined : <span style={{ color: a.oficial ? "var(--tl-white)" : "var(--tl-ink)" }}>{a.ini}</span>} onAuthor={onAuthor}
      name={p.mia ? `${a.nombre}${E2(" · tú", " · you")}` : a.nombre} rank={rk} time={hace(p.at, es)} place={lugar} placeColor={p.invitado ? "var(--tl-pro-ink)" : undefined}
      solved={p.kind === "pregunta" && p.resuelta ? E2("Resuelta", "Solved") : undefined} edited={p.editada && !p.resuelta ? E2("Editada", "Edited") : undefined}
      onMenu={onMenu} menuLabel={E2("Opciones", "Options")} body={t.body} translate={t.translate} bodyFont={full ? "500 16px/1.55" : "500 15px/1.5"} onOpen={onOpen}
      vote={{ score: p.score, voted: p.miVoto !== 0, onUp: () => onVote(1), onDown: () => onVote(-1), upColor: p.miVoto === 1 ? "var(--tl-action)" : undefined, downColor: p.miVoto === -1 ? "var(--tl-danger)" : undefined,
        scoreColor: p.miVoto ? "var(--tl-action)" : "var(--tl-ink)", labels: { up: E2("Votar a favor", "Upvote"), down: E2("Votar en contra", "Downvote"), comments: E2("Comentarios", "Comments"), save: E2("Guardar", "Save"), share: E2("Compartir", "Share") } }}
      comments={p.comentarios ? String(p.comentarios) : E2("Comentar", "Comment")} onComments={onOpen}
      onSave={onSave} saveColor={p.guardada ? "var(--tl-action)" : undefined} saveFill={p.guardada ? "var(--tl-action)" : "none"} onShare={onShare}>
      {p.estado === "hidden" && (
        <div role="note" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(192,57,43,.06)", font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>
          {E2("Ocultamos tu publicación; solo tú la ves.", "We hid your post; only you can see it.")}{p.motivo ? ` ${E2("Motivo", "Reason")}: ${p.motivo}` : ""}
          {p.mia && <a href={`/cuenta/moderacion?k=com_post&id=${p.id}`} style={{ marginLeft: 6, font: "800 12.5px Manrope,sans-serif", color: "var(--tl-action)", textDecoration: "none" }}>{E2("Apelar", "Appeal")}</a>}
        </div>
      )}
      {p.revision > 0 && (
        <div role="note" data-screen-label="Publicación · fotos en revisión" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(11,14,18,.05)", font: "600 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.7)" }}>
          {p.revision === 1 ? E2("1 foto espera revisión antes de verse. Solo tú ves este aviso.", "1 photo is waiting for review before it shows. Only you see this notice.")
            : E2(`${p.revision} fotos esperan revisión antes de verse. Solo tú ves este aviso.`, `${p.revision} photos are waiting for review before they show. Only you see this notice.`)}
        </div>
      )}
      {p.fotos.length > 0 && (
        <div data-screen-label="Publicación · fotos" style={{ position: "relative", marginTop: 12, borderRadius: 16, overflow: "hidden", background: "var(--tl-ink)" }}>
          <div className="hs" onScroll={(e) => { const t = e.currentTarget; setIx(Math.round(t.scrollLeft / Math.max(1, t.clientWidth))); }} style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory" }}>
            {p.fotos.map((f, i) => (
              <div key={i} onClick={onOpen} style={{ flex: "none", width: "100%", scrollSnapAlign: "start", aspectRatio: full ? "4 / 3" : "4 / 5", maxHeight: 520, background: `url("${f}") center/cover`, backgroundColor: "var(--tl-photo-bg)", cursor: onOpen ? "pointer" : "default" }} role="img" aria-label={E2(`Foto ${i + 1} de ${p.fotos.length}`, `Photo ${i + 1} of ${p.fotos.length}`)} />
            ))}
          </div>
          {p.fotos.length > 1 && <span style={{ position: "absolute", top: 12, right: 12, padding: "4px 9px", borderRadius: 99, background: "rgba(11,14,18,.6)", color: "var(--tl-white)", font: `700 10px ${MONO}` }}>{`${ix + 1}/${p.fotos.length}`}</span>}
        </div>
      )}
      {p.negocio && (
        <div data-screen-label="Publicación · negocio" role="link" onClick={() => onBiz(p.negocio!.id)} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px 10px 10px", borderRadius: 16, background: "var(--tl-paper)", cursor: "pointer" }}>
          <span style={{ width: 52, height: 52, borderRadius: 12, background: p.negocio.foto ? `url("${p.negocio.foto}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-action)" }}>{E2("RECOMIENDA", "RECOMMENDS") + (p.negocio.para[0] ? ` · ${E2("PARA ", "FOR ")}${p.negocio.para[0].toUpperCase()}` : "")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}><span style={{ minWidth: 0, font: "700 15px/1.25 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.negocio.nombre}</span>{p.negocio.verificado && <span style={{ display: "grid", flex: "none" }}><Icon name="verified" size={15} color="var(--tl-action)" /></span>}</div>
            {(es ? p.negocio.meta.es : p.negocio.meta.en) && <span style={{ font: "500 12.5px/1.3 Manrope,sans-serif", color: "rgba(11,14,18,.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{es ? p.negocio.meta.es : p.negocio.meta.en}</span>}
          </div>
          <span style={{ flex: "none", font: "700 12px Manrope,sans-serif", color: "var(--tl-action)" }}>{E2("Ver", "View")}</span>
        </div>
      )}
      {enc && (
        <div data-screen-label="Publicación · encuesta" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {enc.opts.map((o, i) => {
            const pc = o.pc, mia = enc.mio === i;
            return (
              <button key={i} type="button" disabled={enc.mio != null || enc.cerrada} onClick={() => onPoll(i)} aria-pressed={mia || undefined}
                style={{ position: "relative", overflow: "hidden", minHeight: 46, boxSizing: "border-box", padding: "0 14px", borderRadius: 12, background: "var(--tl-paper)", display: "flex", alignItems: "center", gap: 10, cursor: enc.mio != null || enc.cerrada ? "default" : "pointer", border: "none", textAlign: "left", color: "var(--tl-ink)" }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: ver ? `${pc}%` : "0%", background: mia ? "rgba(75,55,245,.14)" : "rgba(11,14,18,.05)", transition: "width .4s" }} />
                <span style={{ position: "relative", flex: 1, minWidth: 0, padding: "12px 0", font: `${mia ? 800 : 600} 14px/1.3 Manrope,sans-serif` }}>{o.l}</span>
                {mia && <span style={{ position: "relative", display: "grid" }}><Icon name="check" size={14} color="var(--tl-action)" strokeWidth={2.2} /></span>}
                {ver && <span style={{ position: "relative", font: "700 13px Sora,sans-serif", letterSpacing: "-.02em" }}>{pc}%</span>}
              </button>);
          })}
          <div style={{ marginTop: 4, font: `700 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.45)" }}>
            {`${ver ? `${enc.total} ${E2("VOTOS", "VOTES")}` : E2("VOTA PARA VER CÓMO VA", "VOTE TO SEE RESULTS")} · ${dias(enc.cierra, es)}${enc.mio != null ? E2(" · TU VOTO NO SE CAMBIA", " · YOUR VOTE IS FINAL") : ""}`}
          </div>
        </div>
      )}
      {p.salud && (
        <div role="note" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(192,57,43,.06)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="emergency" size={15} color="var(--tl-danger)" /></span>
          <span style={{ font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)", textWrap: "pretty" }}>{es ? LINEA911.es : LINEA911.en}</span>
        </div>
      )}
    </PostCard>
  );
}
