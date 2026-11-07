"use client";
/* APP-COM-POST · la publicación (prototipo postV): la tarjeta completa con su menú, «Publicado. Lo ven tus vecinos…» al llegar recién
   publicada, quién publica y las reglas del barrio a la derecha en escritorio, y los comentarios por votos (la mejor respuesta arriba).
   Comentar, responder, votar comentarios y «Me sirvió» llegan con el hilo (5b). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { reglas } from "@/lib/comunidad-filtro";
import { hace, rango, type Pub } from "@/lib/comunidad-comun";
import type { Publicacion as P } from "@/lib/comunidad";
import { Avatar, LINE, MONO, Marco, Reglas, useAncho, useComUi, type YoCom } from "../../Marco";
import { useAccionesPub } from "../../Muro";
import { Tarjeta } from "../../Tarjeta";

type N = "Icon" | "Button" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag } = UI as unknown as Record<N, ComponentType<any>>;

export function Publicacion({ es, yo, ciudad, d, nueva, editada }: { es: boolean; yo: YoCom; ciudad: string; d: P | null; nueva: boolean; editada: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(), D = useAncho() >= 1024;
  const [pub, setPub] = useState<Pub | null>(d?.pub ?? null);
  const [borrada, setBorrada] = useState(false);
  useEffect(() => { setPub(d?.pub ?? null); }, [d]);
  useEffect(() => { if (editada) ui.setAviso({ t: E2("Cambios guardados.", "Changes saved.") }); }, [editada]); // eslint-disable-line react-hooks/exhaustive-deps
  const acc = useAccionesPub(es, ui, (_id, f) => setPub((p) => (p ? f(p) : p)), () => setBorrada(true), (p) => { setBorrada(false); setPub(p); });
  const R = reglas(yo.ciudad);
  if (!d || !pub || borrada) {
    return (
      <Marco es={es} yo={yo} ui={ui} code="APP-COM-POST" titulo={E2("Publicación", "Post")} sub={ciudad.toUpperCase()} back="/comunidad">
        <div data-screen-label="Publicación · no está" style={{ margin: D ? 0 : "14px 16px", maxWidth: 720, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 18 }}>
          <div style={{ font: "800 18px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{borrada ? E2("Borraste esta publicación", "You deleted this post") : E2("Esta publicación ya no está", "This post is no longer here")}</div>
          <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{borrada ? E2("Puedes deshacerlo en los siguientes segundos.", "You can undo it in the next few seconds.") : E2("La borró quien la publicó o ya no se puede ver.", "It was deleted or can no longer be seen.")}</div>
          <div style={{ marginTop: 14, display: "flex" }}><Button variant="secondary" size="md" icon="chevronLeft" onClick={() => router.push("/comunidad")}>{E2("Volver a la Comunidad", "Back to the Community")}</Button></div>
        </div>
      </Marco>);
  }
  const a = pub.autor;
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-POST" titulo={E2("Publicación", "Post")} sub={`${ciudad.toUpperCase()} · ${hace(pub.at, es).toUpperCase()}`} back="/comunidad"
      aside={<>
        {!a.oficial && (
          <div data-screen-label="Publicación · autor" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 }}>
            <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{E2("QUIEN PUBLICA", "POSTED BY")}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}><Avatar foto={a.foto} ini={a.ini} size={38} />
              <div style={{ minWidth: 0 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{a.nombre}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{`${(es ? rango(a.rango).es : rango(a.rango).en).toUpperCase()} · ${(es ? pub.lugar.es : pub.lugar.en).toUpperCase()}`}</div></div></div>
          </div>
        )}
        <Reglas es={es} R={R} />
      </>}>
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: D ? 14 : 0 }}>
        {nueva && (
          <div data-screen-label="Publicación · publicada" role="status" style={{ margin: D ? 0 : "12px 16px 0", padding: "13px 14px", borderRadius: 14, background: "rgba(0,229,196,.12)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="check" size={16} strokeWidth={2.4} color="var(--tl-open-text)" /></span>
            <div><div style={{ font: "700 13.5px/1.35 Manrope,sans-serif", color: "var(--tl-open-text)" }}>{E2(`Publicado. Lo ven tus vecinos de ${ciudad}.`, `Posted. Your ${ciudad} neighbors can see it.`)}</div>
              <div style={{ marginTop: 3, font: "500 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-open-text)" }}>{E2("Los puntos llegan cuando otros votan o te responden.", "Points come when others vote or reply.")}</div></div>
          </div>
        )}
        <div style={{ background: "var(--tl-white)", overflow: "hidden" }} className="lg:rounded-[20px] lg:border lg:border-ink/[.08]">
          <Tarjeta p={pub} es={es} full onMenu={() => acc.menu(pub)} onVote={(v) => void acc.votar(pub, v)} onPoll={(i) => void acc.encuesta(pub, i)} onSave={() => void acc.guardar(pub)} onShare={() => void acc.compartir(pub)} onBiz={(id) => router.push(`/n/${id}`)} />
        </div>
        <div data-screen-label="Publicación · comentarios" style={{ background: "var(--tl-white)", padding: "16px 20px 20px", borderTop: D ? "none" : "8px solid var(--tl-paper)" }} className="lg:rounded-[20px] lg:border lg:border-ink/[.08]">
          <div style={{ font: "800 16px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{pub.comentarios ? E2(`${pub.comentarios} ${pub.comentarios === 1 ? "comentario" : "comentarios"}`, `${pub.comentarios} ${pub.comentarios === 1 ? "comment" : "comments"}`) : E2("Comentarios", "Comments")}</div>
          {!d.comentarios.length ? (
            <div style={{ marginTop: 10 }}><div style={{ font: "700 14px/1.35 Manrope,sans-serif" }}>{pub.kind === "pregunta" ? E2("Nadie ha respondido todavía", "No answers yet") : E2("Sin comentarios todavía", "No comments yet")}</div></div>
          ) : d.comentarios.map((c, i) => (
            <div key={c.id} style={{ padding: "14px 0", borderTop: i ? LINE : "none", marginTop: i ? 0 : 6 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Avatar foto={c.autor.foto} ini={c.autor.ini} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ font: "700 13.5px/1.3 Sora,sans-serif", letterSpacing: "-.02em" }}>{c.autor.nombre}</span>
                    {c.autor.rango >= 4 && <span style={{ font: "700 12px Manrope,sans-serif", color: c.autor.rango >= 9 ? "var(--tl-pro-ink)" : "rgba(11,14,18,.6)" }}>{es ? rango(c.autor.rango).es : rango(c.autor.rango).en}</span>}
                    <span style={{ font: "500 12px Manrope,sans-serif", color: "rgba(11,14,18,.5)" }}>{hace(c.at, es)}</span>
                    {c.mejor && <Tag tone="signal">{E2("MEJOR RESPUESTA", "BEST ANSWER")}</Tag>}
                  </div>
                  <div style={{ marginTop: 4, font: "500 14px/1.5 Manrope,sans-serif", textWrap: "pretty", wordBreak: "break-word" }}>{c.body}</div>
                  {c.negocio && <div role="link" onClick={() => router.push(`/n/${c.negocio!.id}`)} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 10, background: "var(--tl-paper)", font: "700 12.5px Manrope,sans-serif", cursor: "pointer" }}><Icon name="store" size={14} color="var(--tl-action)" />{c.negocio.nombre}</div>}
                  <div style={{ marginTop: 6, font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.45)" }}>{`${c.score} ${E2("VOTOS", "VOTES")}${c.respuestas ? ` · ${c.respuestas} ${c.respuestas === 1 ? E2("RESPUESTA", "REPLY") : E2("RESPUESTAS", "REPLIES")}` : ""}`}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Marco>
  );
}
