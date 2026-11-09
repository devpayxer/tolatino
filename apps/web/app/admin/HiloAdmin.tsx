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
import { rango } from "@/lib/comunidad-comun";
import { TEMAS } from "@/lib/comunidad-filtro";
import { cmComOcultar, pubOcultar } from "./acciones-comunidad";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, PLANT, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D = UI as unknown as Record<"PostCard" | "CommentCard" | "Button" | "AdminNote", ComponentType<any>>;
const TIPO: Record<string, string> = { pregunta: "PREGUNTA", recomendacion: "RECOMENDACIÓN", encuesta: "ENCUESTA", publicacion: "PUBLICACIÓN" };
const fecha = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "").toUpperCase();
const rk = (n: number) => (n >= 4 ? { label: rango(n).es.toUpperCase(), tone: n >= 9 ? "ink" : "neutral" } : null);

export function HiloAdmin({ h, marcado, puede }: { h: H; marcado: string | null; puede: boolean }) {
  const router = useRouter(), desk = useAncho() >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  useEffect(() => { if (marcado) document.querySelector("[data-adm-focus]")?.scrollIntoView({ block: "center" }); }, [marcado]);
  const p = h.p, oculta = p.status === "hidden";
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const ocultar = (que: "pub" | "cm", id: string, quien: string, ya: boolean) => setConf({
    titulo: ya ? "¿Por qué vuelve a verse?" : que === "pub" ? `Ocultar la publicación de ${quien}` : `Ocultar el comentario de ${quien}`,
    sub: ya ? "Vuelve para todos y el autor recibe el aviso." : "Sale para todos. El autor recibe el motivo y puede apelar; queda en la auditoría.", peligro: !ya, plantillas: ya ? PLANT.keep : PLANT.hide,
    hacer: (m) => (que === "pub" ? pubOcultar(id, !ya, m) : cmComOcultar(id, !ya, m)),
  });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO · HILO", t: "Hilo", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const total = (p.conteo ?? []).reduce((a, x) => a + x, 0);
  const tema = TEMAS.find((t) => t[0] === p.topic)?.[1];
  const cm = (c: CmAdm) => {
    const foco = c.id === marcado, oc = c.status === "hidden";
    return (
      <div key={c.id} id={`c${c.id}`} {...(foco ? { "data-adm-focus": "1" } : {})} style={{ marginLeft: c.parent ? (desk ? 44 : 22) : 0, borderRadius: 20, outline: foco ? "2px solid var(--tl-action)" : "none", outlineOffset: 2, opacity: oc ? 0.75 : 1 }}>
        <D.CommentCard screenLabel="Contenido · hilo · comentario" bg={foco ? "rgba(75,55,245,.05)" : oc ? "rgba(192,57,43,.04)" : "var(--tl-white)"}
          initials={c.who.slice(0, 1)} avatarColor="var(--tl-desk)" name={c.who} rank={rk(c.rango)} time={`${fecha(c.at)}${c.parent ? " · RESPUESTA" : ""}`}
          body={c.body} business={c.biz ? { name: c.biz } : undefined} actions={{ vote: { score: `+${c.up} / −${c.dn}` } }}>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {foco ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-action)" }}>COMENTARIO DE ORIGEN</span> : null}
            {oc ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-danger)" }}>{`OCULTO${c.hiddenBy === "auto" ? " POR REPORTES" : ""}${c.why ? ` · ${c.why.toUpperCase()}` : ""}`}</span> : null}
            {c.rep ? <span style={{ font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "var(--tl-pro-ink)" }}>{`REPORTADO · ${c.rep}`}</span> : null}
            <span style={{ flex: 1 }} />
            {puede ? <D.Button size="sm" variant={oc ? "secondary" : "danger"} onClick={() => ocultar("cm", c.id, c.who, oc)}>{oc ? "Restaurar" : "Ocultar"}</D.Button> : null}
            <D.Button size="sm" variant="secondary" onClick={() => router.push(`/admin/usuarios/${c.uid}?tab=comunidad`)}>Autor</D.Button>
          </div>
        </D.CommentCard>
      </div>);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <PanelBloques bloques={[{ type: "head", eye: `CONTENIDO · HILO · ${p.ciudad.toUpperCase()}`, t: TIPO[p.kind] ? `${TIPO[p.kind]!.charAt(0)}${TIPO[p.kind]!.slice(1).toLowerCase()} de ${p.who}` : p.who,
        s: `${p.cms} ${p.cms === 1 ? "comentario" : "comentarios"} · +${p.up} / −${p.dn}${p.fijada ? " · fijada" : ""}${p.cerrados ? " · comentarios bloqueados" : ""}`, onBack: () => router.back(), h1: desk ? 26 : 22 }]} />
      {oculta ? <D.AdminNote tone="bad" icon="ban">{`Oculta${p.hiddenBy === "auto" ? " por reportes (en revisión)" : ""}: ${p.why ?? "sin motivo"}. Su autor ve el motivo y puede apelar.`}</D.AdminNote> : null}
      {p.rep ? <D.AdminNote tone="warn" icon="warning" cta="Ir al reporte" onCta={() => router.push("/admin/colas?cola=rep")}>{`Tiene ${p.rep} ${p.rep === 1 ? "reporte abierto" : "reportes abiertos"}. Decídelo en la cola para que el motivo y la apelación sigan el flujo completo.`}</D.AdminNote> : null}
      <div style={{ opacity: oculta ? 0.75 : 1 }}>
        <D.PostCard card screenLabel="Contenido · hilo · publicación" avatarColor={p.oficial ? "var(--tl-ink)" : "var(--tl-desk)"} initials={<span style={{ color: p.oficial ? "var(--tl-white)" : "var(--tl-ink)" }}>{p.who.slice(0, 1)}</span>}
          name={p.who} rank={p.oficial ? { label: "Cuenta oficial", shield: null } : p.rango >= 4 ? { label: rango(p.rango).es, shield: p.rango >= 9 ? "gold" : "gray" } : null}
          time={fecha(p.at)} place={p.inv ? `Invitado · de ${p.inv}` : p.ciudad} placeColor={p.inv ? "var(--tl-pro-ink)" : undefined}
          tags={[{ label: TIPO[p.kind] ?? "PUBLICACIÓN", tone: "neutral" }, ...(tema ? [{ label: tema.toUpperCase(), tone: "neutral" }] : [])]} body={p.body} vote={{ score: p.score }}>
          {p.fotos.length ? <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: `repeat(${Math.min(2, p.fotos.length)},minmax(0,1fr))`, gap: 6, borderRadius: 14, overflow: "hidden" }}>
            {p.fotos.map((u, i) => <span key={i} style={{ height: 150, background: `url(${u}) center/cover`, backgroundColor: "var(--tl-photo-bg)" }} />)}</div> : null}
          {p.opts ? <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{p.opts.map((o, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--tl-paper)", display: "flex", justifyContent: "space-between", font: "700 13px Manrope,sans-serif" }}>
              <span>{o}</span><span>{(p.conteo ?? [])[i] ?? 0} · {total ? Math.round((100 * ((p.conteo ?? [])[i] ?? 0)) / total) : 0}%</span></div>))}</div> : null}
          {p.biz ? <div style={{ marginTop: 12, padding: 13, borderRadius: 16, background: "var(--tl-paper)", font: "700 13px/1.4 Manrope,sans-serif" }}>{`Recomienda: ${p.biz}`}</div> : null}
        </D.PostCard>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {puede && !p.oficial ? <D.Button size="sm" variant={oculta ? "secondary" : "danger"} onClick={() => ocultar("pub", p.id, p.who, oculta)}>{oculta ? "Restaurar la publicación" : "Ocultar la publicación"}</D.Button> : null}
        {p.uid ? <D.Button size="sm" variant="secondary" onClick={() => router.push(`/admin/usuarios/${p.uid}?tab=comunidad`)}>Ver autor</D.Button> : null}
      </div>
      <PanelBloques bloques={[{ type: "group", k: `COMENTARIOS · ${h.comentarios.length} · LOS MÁS VOTADOS PRIMERO` }]} />
      {h.comentarios.length ? h.comentarios.map(cm) : <PanelBloques bloques={[{ type: "empty", icon: "bubble", t: "Sin comentarios", s: "Nadie ha comentado todavía." }]} />}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
