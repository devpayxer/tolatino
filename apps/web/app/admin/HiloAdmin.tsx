"use client";
/* ADM-CONT › el hilo (Super Admin.dc.html threadDetail, MEM 700): la publicación como en la Comunidad (PostCard: autor, rango, tema,
   fotos, encuesta con sus votos, el negocio recomendado, votos) y sus comentarios (CommentCard), las raíces por votos y cada respuesta
   debajo; el comentario de origen va marcado y con scroll (data-adm-focus). Lo oculto sale marcado con su motivo. Ocultar o restaurar
   con motivo (avisa al autor y abre apelación), y el enlace a sus reportes en Colas. El Super Admin ve siempre el original. */
import * as UI from "@tolatino/ui";
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { CmAdm, HiloAdmin as H } from "@/lib/admin-contenido";
import { marcaAnfitrion, rango } from "@/lib/comunidad-comun";
import { TEMAS } from "@/lib/comunidad-filtro";
import { cmComOcultar, pubOcultar } from "./acciones-comunidad";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, plantE, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";
import { fotoFondo } from "@tolatino/ui";

type EF = (es: string, en: string) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D = UI as unknown as Record<"PostCard" | "CommentCard" | "Button" | "AdminNote", ComponentType<any>>;
const TIPO = (E2: EF): Record<string, string> => ({
  pregunta: E2("PREGUNTA", "QUESTION"), recomendacion: E2("RECOMENDACIÓN", "RECOMMENDATION"), encuesta: E2("ENCUESTA", "POLL"),
  publicacion: E2("PUBLICACIÓN", "POST")
});
const fecha = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "").toUpperCase();
const rk = (n: number, en = false) => (n >= 4 ? { label: (en ? rango(n).en : rango(n).es).toUpperCase(), tone: n >= 9 ? "ink" : "neutral" } : null);

export function HiloAdmin({ h, marcado, puede }: { h: H; marcado: string | null; puede: boolean }) {
  const router = useRouter(), desk = useAncho() >= 1024, { E2 } = useE2(), en = E2("", "x") === "x", P = plantE(E2), TP = TIPO(E2);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  useEffect(() => { if (marcado) document.querySelector("[data-adm-focus]")?.scrollIntoView({ block: "center" }); }, [marcado]);
  const p = h.p, oculta = p.status === "hidden";
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const ocultar = (que: "pub" | "cm", id: string, quien: string, ya: boolean) => setConf({
    titulo: ya ? E2("¿Por qué vuelve a verse?", "Why is it visible again?") : que === "pub" ? E2(`Ocultar la publicación de ${quien}`, `Hide ${quien}’s post`) : E2(`Ocultar el comentario de ${quien}`, `Hide ${quien}’s comment`),
    sub: ya ? E2("Vuelve para todos y el autor recibe el aviso.", "It comes back for everyone and the author is notified.") : E2("Sale para todos. El autor recibe el motivo y puede apelar; queda en la auditoría.", "It’s removed for everyone. The author gets the reason and can appeal; it’s in the audit log."), peligro: !ya, plantillas: ya ? P.keep : P.hide,
    nota: ya ? "interna" : "persona", hacer: (m) => (que === "pub" ? pubOcultar(id, !ya, m) : cmComOcultar(id, !ya, m)),
  });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CONTENIDO · HILO", "CONTENT · THREAD"), t: E2("Hilo", "Thread"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const total = (p.conteo ?? []).reduce((a, x) => a + x, 0);
  const tema = TEMAS(!en).find((t) => t[0] === p.topic)?.[1];
  const cm = (c: CmAdm) => {
    const foco = c.id === marcado, oc = c.status === "hidden";
    return (
      <div key={c.id} id={`c${c.id}`} {...(foco ? { "data-adm-focus": "1" } : {})} style={{ marginLeft: c.parent ? (desk ? 44 : 22) : 0, borderRadius: 20, outline: foco ? "2px solid var(--tl-action)" : "none", outlineOffset: 2, opacity: oc ? 0.75 : 1 }}>
        <D.CommentCard screenLabel="Contenido · hilo · comentario" bg={foco ? "rgba(75,55,245,.05)" : oc ? "rgba(192,57,43,.04)" : "var(--tl-white)"}
          initials={c.who.slice(0, 1)} avatarColor="var(--tl-desk)" name={c.who} rank={c.anf ? { label: marcaAnfitrion(c.anf, !en)!.toUpperCase(), tone: "ink" } : rk(c.rango, en)} time={`${fecha(c.at, en)}${c.parent ? E2(" · RESPUESTA", " · REPLY") : ""}`}
          body={c.body} business={c.biz ? { name: c.biz } : undefined} actions={{ lang: en ? "EN" : "ES", vote: { score: `+${c.up} / −${c.dn}` } }}>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {foco ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-action)" }}>{E2("COMENTARIO DE ORIGEN", "SOURCE COMMENT")}</span> : null}
            {oc ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-danger)" }}>{`${E2("OCULTO", "HIDDEN")}${c.hiddenBy === "auto" ? E2(" POR REPORTES", " BY REPORTS") : ""}${c.why ? ` · ${c.why.toUpperCase()}` : ""}`}</span> : null}
            {c.rep ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-pro-ink)" }}>{`${E2("REPORTADO", "REPORTED")} · ${c.rep}`}</span> : null}
            <span style={{ flex: 1 }} />
            {puede ? <D.Button size="sm" variant={oc ? "secondary" : "danger"} onClick={() => ocultar("cm", c.id, c.who, oc)}>{oc ? E2("Restaurar", "Restore") : E2("Ocultar", "Hide")}</D.Button> : null}
            <D.Button size="sm" variant="secondary" onClick={() => router.push(`/admin/usuarios/${c.uid}?tab=comunidad`)}>{E2("Autor", "Author")}</D.Button>
          </div>
        </D.CommentCard>
      </div>);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <PanelBloques bloques={[{ type: "head", eye: `${E2("CONTENIDO · HILO", "CONTENT · THREAD")} · ${p.ciudad.toUpperCase()}`, t: TP[p.kind] ? E2(`${TP[p.kind]!.charAt(0)}${TP[p.kind]!.slice(1).toLowerCase()} de ${p.who}`, `${TP[p.kind]!.charAt(0)}${TP[p.kind]!.slice(1).toLowerCase()} by ${p.who}`) : p.who,
        s: `${p.cms} ${p.cms === 1 ? E2("comentario", "comment") : E2("comentarios", "comments")} · +${p.up} / −${p.dn}${p.fijada ? E2(" · fijada", " · pinned") : ""}${p.cerrados ? E2(" · comentarios bloqueados", " · comments locked") : ""}`, onBack: () => router.back(), h1: desk ? 26 : 22 }]} />
      {oculta ? <D.AdminNote tone="bad" icon="ban">{E2(`Oculta${p.hiddenBy === "auto" ? " por reportes (en revisión)" : ""}: ${p.why ?? "sin motivo"}. Su autor ve el motivo y puede apelar.`, `Hidden${p.hiddenBy === "auto" ? " by reports (in review)" : ""}: ${p.why ?? "no reason"}. The author sees the reason and can appeal.`)}</D.AdminNote> : null}
      {p.rep ? <D.AdminNote tone="warn" icon="warning" cta={E2("Ir al reporte", "Go to the report")} onCta={() => router.push("/admin/colas?cola=rep")}>{E2(`Tiene ${p.rep} ${p.rep === 1 ? "reporte abierto" : "reportes abiertos"}. Decídelo en la cola para que el motivo y la apelación sigan el flujo completo.`, `It has ${p.rep} open ${p.rep === 1 ? "report" : "reports"}. Decide it in the queue so the reason and the appeal follow the full flow.`)}</D.AdminNote> : null}
      <div style={{ opacity: oculta ? 0.75 : 1 }}>
        <D.PostCard card screenLabel="Contenido · hilo · publicación" avatarColor={p.oficial ? "var(--tl-ink)" : "var(--tl-desk)"} initials={<span style={{ color: p.oficial ? "var(--tl-white)" : "var(--tl-ink)" }}>{p.who.slice(0, 1)}</span>}
          name={p.who} rank={p.anf ? { label: marcaAnfitrion(p.anf, !en)!, shield: null } : p.oficial ? { label: E2("Cuenta oficial", "Official account"), shield: null } : p.rango >= 4 ? { label: en ? rango(p.rango).en : rango(p.rango).es, shield: p.rango >= 9 ? "gold" : "gray" } : null}
          time={fecha(p.at, en)} place={p.inv ? E2(`Invitado · de ${p.inv}`, `Guest · from ${p.inv}`) : p.ciudad} placeColor={p.inv ? "var(--tl-pro-ink)" : undefined}
          tags={[{ label: TP[p.kind] ?? E2("PUBLICACIÓN", "POST"), tone: "neutral" }, ...(tema ? [{ label: tema.toUpperCase(), tone: "neutral" }] : [])]} body={p.body} vote={{ score: p.score, labels: en ? { up: "Upvote", down: "Downvote", comments: "Comments", save: "Save", share: "Share" } : undefined }}>
          {p.fotos.length ? <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: `repeat(${Math.min(2, p.fotos.length)},minmax(0,1fr))`, gap: 6, borderRadius: 14, overflow: "hidden" }}>
            {p.fotos.map((u, i) => <span key={i} style={{ height: 150, background: `${fotoFondo(u, 360)} center/cover`, backgroundColor: "var(--tl-photo-bg)" }} />)}</div> : null}
          {p.opts ? <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{p.opts.map((o, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--tl-paper)", display: "flex", justifyContent: "space-between", font: "700 13px Manrope,sans-serif" }}>
              <span>{o}</span><span>{(p.conteo ?? [])[i] ?? 0} · {total ? Math.round((100 * ((p.conteo ?? [])[i] ?? 0)) / total) : 0}%</span></div>))}</div> : null}
          {p.biz ? <div style={{ marginTop: 12, padding: 13, borderRadius: 16, background: "var(--tl-paper)", font: "700 13px/1.4 Manrope,sans-serif" }}>{E2(`Recomienda: ${p.biz}`, `Recommends: ${p.biz}`)}</div> : null}
        </D.PostCard>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {puede && !p.oficial ? <D.Button size="sm" variant={oculta ? "secondary" : "danger"} onClick={() => ocultar("pub", p.id, p.who, oculta)}>{oculta ? E2("Restaurar la publicación", "Restore the post") : E2("Ocultar la publicación", "Hide the post")}</D.Button> : null}
        {p.uid ? <D.Button size="sm" variant="secondary" onClick={() => router.push(`/admin/usuarios/${p.uid}?tab=comunidad`)}>{E2("Ver autor", "See author")}</D.Button> : null}
      </div>
      <PanelBloques bloques={[{ type: "group", k: E2(`COMENTARIOS · ${h.comentarios.length} · LOS MÁS VOTADOS PRIMERO`, `COMMENTS · ${h.comentarios.length} · MOST VOTED FIRST`) }]} />
      {h.comentarios.length ? h.comentarios.map(cm) : <PanelBloques bloques={[{ type: "empty", icon: "bubble", t: E2("Sin comentarios", "No comments"), s: E2("Nadie ha comentado todavía.", "Nobody has commented yet.") }]} />}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
