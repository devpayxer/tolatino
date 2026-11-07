"use client";
/* APP-COM-NUEVO · publicar (prototipo newV): el tipo (pregunta · recomendación · encuesta · publicación; la encuesta se abre en
   Cabo), el negocio con buscador de la ciudad y «No es mi negocio y no trabajo ahí», «¿para qué lo recomiendas?», el texto, el tema
   (pregunta), las opciones y cuánto dura (encuesta), hasta 4 fotos, a quién le sale y las reglas. El error del filtro sale en la
   misma caja; si parece una emergencia, la línea del 911. En escritorio, la vista previa a la derecha. Editar: solo el texto, el tema,
   «para…» y las fotos, en los primeros 30 minutos. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { DIAS_ENCUESTA, EMERGENCIA911, MAX_FOTOS, MIN_TEXTO, RANGO_ENCUESTA, TEMAS, pareceEmergencia, reglas, revisarPublicacion, type Borrador, type Tipo } from "@/lib/comunidad-filtro";
import { TIPO, rango } from "@/lib/comunidad-comun";
import { subirFoto } from "@/lib/subir-foto";
import type { NegocioRec } from "@/lib/comunidad";
import { comEditar, comNegocios, comPublicar } from "../acciones";
import { Avatar, LINE, MONO, Marco, Reglas, useAncho, useComUi, type YoCom } from "../Marco";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
type Editar = { id: string; noEsta: true } | { id: string; kind: Tipo; body: string; topic: string | null; para: string[]; a_tiempo: boolean; biz: string | null; biz_name: string | null; opts: string[] | null; fotos: { id: string; url: string }[] };
type Foto = { id: string; url: string };
const K = (s: string) => ({ font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)", ...(s ? {} : {}) });

export function Nuevo({ es, yo, ciudad, abierta, silenciado, k, texto, editar }: {
  es: boolean; yo: YoCom; ciudad: string; abierta: boolean; silenciado: { hasta: string | null; motivo: string | null } | null; k: Tipo; texto: string; editar: Editar | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(), D = useAncho() >= 1024;
  const ed = editar && !("noEsta" in editar) ? editar : null;
  const [kind, setKind] = useState<Tipo>(ed?.kind ?? k);
  const [body, setBody] = useState(ed?.body ?? texto);
  const [topic, setTopic] = useState<string>(ed?.topic ?? "");
  const [biz, setBiz] = useState<NegocioRec | null>(ed?.biz ? { id: ed.biz, nombre: ed.biz_name ?? "", meta: { es: "", en: "" }, subs: [], foto: null, verificado: false } : null);
  const [noEsMio, setNoEsMio] = useState(!!ed);
  const [para, setPara] = useState<string | null>(ed?.para[0] ?? null);
  const [opts, setOpts] = useState<string[]>(ed?.opts ?? ["", ""]);
  const [dias, setDias] = useState<number>(3);
  const [fotos, setFotos] = useState<Foto[]>(ed?.fotos ?? []);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState<Bi | null>(null), [busy, setBusy] = useState(false);
  const [buscar, setBuscar] = useState<string | null>(null), [hall, setHall] = useState<NegocioRec[]>([]);
  useEffect(() => {
    if (buscar == null || buscar.trim().length < 2) { setHall([]); return; }
    const t = setTimeout(async () => { const r = await comNegocios(buscar).catch(() => null); if (r?.ok) setHall(r.items); }, 220);
    return () => clearTimeout(t);
  }, [buscar]);
  const bloqueada = kind === "encuesta" && yo.rango < RANGO_ENCUESTA && !ed;
  const borrador: Borrador = { kind, body, topic: topic || null, business: biz?.id ?? null, para: para ? [para] : [], opts, dias, fotos: fotos.map((f) => f.id), noEsMio };
  const local = revisarPublicacion(ed ? { ...borrador, opts: ed.opts ?? undefined, dias: 1, noEsMio: true } : borrador);
  const emergencia = pareceEmergencia(body);
  const R = reglas(yo.ciudad);

  if (editar && (!ed || !ed.a_tiempo)) {
    const t = !ed ? E2("Esta publicación ya no está", "This post is no longer here") : E2("Ya no se puede editar", "It can no longer be edited");
    const s = !ed ? E2("La borraste o ya no es tuya.", "You deleted it or it is not yours.") : E2("Pasaron 30 minutos desde que la publicaste. Puedes borrarla y publicar otra.", "30 minutes have passed since you posted it. You can delete it and post again.");
    return (
      <Marco es={es} yo={yo} ui={ui} code="APP-COM-NUEVO" titulo={E2("Editar publicación", "Edit post")} sub={`${ciudad.toUpperCase()}`} back={`/comunidad/p/${editar.id}`}>
        <div data-screen-label="Publicar · ya no se edita" role="alert" style={{ margin: D ? 0 : "14px 16px", maxWidth: 720, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 18 }}>
          <div style={{ font: "800 18px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{t}</div>
          <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{s}</div>
          <div style={{ marginTop: 14, display: "flex" }}><Button variant="secondary" size="md" icon="chevronLeft" onClick={() => router.push(ed ? `/comunidad/p/${editar.id}` : "/comunidad")}>{E2("Volver", "Back")}</Button></div>
        </div>
      </Marco>);
  }

  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    setSubiendo(true); setErr(null);
    for (const f of Array.from(files).slice(0, MAX_FOTOS - fotos.length)) {
      const r = await subirFoto(f);
      if (r.ok && r.id && r.url) setFotos((L) => (L.length < MAX_FOTOS ? [...L, { id: r.id!, url: r.url! }] : L));
      else { setErr(r.mensaje ?? { es: "No se pudo subir la foto.", en: "The photo could not be uploaded." }); break; }
    }
    setSubiendo(false);
  };
  const publicar = async () => {
    if (busy) return;
    if (local) { setErr(local.msg); return; }
    setBusy(true); setErr(null);
    const r = await (ed ? comEditar(ed.id, { body, topic: topic || null, para: para ? [para] : [], fotos: fotos.map((f) => f.id) }) : comPublicar(borrador))
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } }));
    setBusy(false);
    // 5d · «crisis» = el texto habla de hacerse daño: la publicación abre con la línea del 988.
    if (r.ok && "id" in r) { const x = "crisis" in r && r.crisis ? "&ayuda=988" : ""; router.push(ed ? `/comunidad/p/${r.id}?editada=1${x}` : `/comunidad/p/${r.id}?nueva=1${x}`); return; }
    if ("entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent("/comunidad/nuevo")}`); return; }
    if (!r.ok) setErr(r.msg);
  };
  const TX: Record<Tipo, [string, string]> = {
    pregunta: [E2("TU PREGUNTA", "YOUR QUESTION"), E2("Ej.: ¿Quién arregla lavadoras en el North End?", "E.g.: Who fixes washers in the North End?")],
    recomendacion: [E2("¿POR QUÉ LO RECOMIENDAS?", "WHY DO YOU RECOMMEND THEM?"), E2("Qué te hicieron, cuánto pagaste y cómo te trataron.", "What they did, what you paid and how they treated you.")],
    encuesta: [E2("LA PREGUNTA DE LA ENCUESTA", "POLL QUESTION"), E2("Ej.: ¿A qué hora debería abrir el mercado del sábado?", "E.g.: What time should the Saturday market open?")],
    publicacion: [E2("¿QUÉ QUIERES CONTAR?", "WHAT DO YOU WANT TO SHARE?"), E2("Un aviso, algo que viste, una foto del barrio.", "A notice, something you saw, a neighborhood photo.")],
  };
  const n = body.trim().length, caja = { borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 } as const;
  const nota = local ? (es ? local.msg.es : local.msg.en).toUpperCase() : E2("LOS PUNTOS LLEGAN CUANDO OTROS VOTAN", "POINTS COME WHEN OTHERS VOTE");
  const puede = abierta && !silenciado && !bloqueada && !subiendo;
  const preview = (
    <div data-screen-label="Publicar · vista previa" style={caja}>
      <div style={K("")}>{E2("ASÍ SE VE EN LA CONVERSACIÓN", "HOW IT LOOKS IN THE FEED")}</div>
      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}><Avatar foto={yo.foto} ini={yo.ini} size={34} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px Sora,sans-serif" }}>{yo.nombre}</div><div style={{ marginTop: 2, font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{`${(es ? TIPO[kind].es : TIPO[kind].en).toUpperCase()} · ${E2("AHORA", "NOW")}`}</div></div></div>
      <div style={{ marginTop: 10, font: "500 14px/1.5 Manrope,sans-serif", color: body.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.4)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{body.trim() || TX[kind][1]}</div>
      {biz && <div style={{ marginTop: 10, padding: 10, borderRadius: 13, background: "var(--tl-paper)", display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 36, height: 36, borderRadius: 10, background: biz.foto ? `url("${biz.foto}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none" }} /><div style={{ minWidth: 0 }}><div style={{ font: `700 9px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-action)" }}>{E2("RECOMIENDA", "RECOMMENDS") + (para ? ` · ${para.toUpperCase()}` : "")}</div><div style={{ marginTop: 2, font: "700 13.5px Sora,sans-serif" }}>{biz.nombre}</div></div></div>}
      {kind === "encuesta" && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>{opts.filter((o) => o.trim()).map((o, i) => <div key={i} style={{ padding: "10px 12px", borderRadius: 11, background: "var(--tl-paper)", font: "600 13px Manrope,sans-serif" }}>{o}</div>)}</div>}
      {fotos.length > 0 && kind !== "encuesta" && <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: `repeat(${Math.min(3, fotos.length)},minmax(0,1fr))`, gap: 6 }}>{fotos.slice(0, 3).map((f) => <span key={f.id} style={{ aspectRatio: "1", borderRadius: 10, background: `url("${f.url}") center/cover` }} />)}</div>}
    </div>
  );
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-NUEVO" titulo={ed ? E2("Editar publicación", "Edit post") : E2("Nueva publicación", "New post")} sub={`${ciudad.toUpperCase()} · ${E2("MI CIUDAD", "MY CITY")}`} back={ed ? `/comunidad/p/${ed.id}` : "/comunidad"}
      aside={<>{preview}<Reglas es={es} R={R} /></>}>
      <div data-screen-label="APP-COM-NUEVO · publicar" style={{ padding: D ? 0 : "14px 16px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
        {silenciado && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(192,57,43,.08)", font: "600 13px/1.5 Manrope,sans-serif", color: "var(--tl-danger)" }}>{E2(`No puedes publicar hasta el ${silenciado.hasta ? new Date(silenciado.hasta).toLocaleDateString("es-US", { day: "numeric", month: "long" }) : "aviso"}`, `You can't post until ${silenciado.hasta ? new Date(silenciado.hasta).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "further notice"}`)}{silenciado.motivo ? `: ${silenciado.motivo}` : "."} {E2("Puedes seguir leyendo.", "You can keep reading.")} <a href="/cuenta/moderacion" style={{ font: "800 13px Manrope,sans-serif", color: "var(--tl-action)", textDecoration: "none" }}>{E2("Ver y apelar", "View and appeal")}</a></div>}
        {!abierta && <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(75,55,245,.07)", font: "600 13px/1.5 Manrope,sans-serif", color: "var(--tl-action-ink)" }}>{E2("La Comunidad de esta ciudad abre cuando abra la ciudad.", "This city's Community opens when the city opens.")}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          {(["pregunta", "recomendacion", "encuesta", "publicacion"] as Tipo[]).map((x) => {
            const on = x === kind, dis = !!ed && !on, lock = x === "encuesta" && yo.rango < RANGO_ENCUESTA;
            return (
              <div key={x} role="radio" aria-checked={on} aria-disabled={dis || undefined} tabIndex={0} onClick={dis ? undefined : () => { setKind(x); setErr(null); }} onKeyDown={(e) => { if (!dis && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setKind(x); } }}
                style={{ padding: 13, borderRadius: 16, background: "var(--tl-white)", boxSizing: "border-box", border: `1.5px solid ${on ? "var(--tl-ink)" : "rgba(11,14,18,.1)"}`, cursor: dis ? "default" : "pointer", opacity: dis ? 0.45 : 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 11, background: on ? "var(--tl-ink)" : "rgba(75,55,245,.1)", display: "grid", placeItems: "center" }}><Icon name={TIPO[x].ic} size={17} color={on ? "var(--tl-white)" : "var(--tl-action)"} /></span>
                  {lock && <Icon name="lock" size={14} color="rgba(11,14,18,.45)" />}
                </div>
                <div><div style={{ font: "800 14px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{es ? TIPO[x].es : TIPO[x].en}</div><div style={{ marginTop: 4, font: "500 11.5px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.58)" }}>{es ? TIPO[x].s.es : TIPO[x].s.en}</div></div>
              </div>);
          })}
        </div>
        {bloqueada ? (
          <div data-screen-label="Publicar · encuesta bloqueada" style={{ ...caja, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="lock" size={18} color="var(--tl-action)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 16px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Las encuestas se abren en Cabo", "Polls open at Corporal")}</div>
              <div style={{ marginTop: 5, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>{E2(`Llegas a Cabo con 5 comentarios que reciban votos +. Hoy eres ${rango(yo.rango).es}.`, `You reach Corporal with 5 comments that get upvotes. Today you are ${rango(yo.rango).en}.`)}</div></div>
          </div>
        ) : (
          <>
            <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 16 }}>
              {kind === "recomendacion" && (
                <div>
                  <div style={K("")}>{E2("EL NEGOCIO", "THE BUSINESS")}</div>
                  {biz ? (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 15, background: "var(--tl-paper)", display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ width: 48, height: 48, borderRadius: 13, background: biz.foto ? `url("${biz.foto}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ font: "700 14px/1.25 Manrope,sans-serif" }}>{biz.nombre}</span>{biz.verificado && <Icon name="verified" size={15} color="var(--tl-action)" />}</div>{(es ? biz.meta.es : biz.meta.en) && <div style={{ marginTop: 3, font: `600 9.5px ${MONO}`, letterSpacing: ".04em", color: "rgba(11,14,18,.5)" }}>{(es ? biz.meta.es : biz.meta.en).toUpperCase()}</div>}</div>
                      {!ed && <span role="button" onClick={() => { setBuscar(""); }} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", flex: "none" }}>{E2("Cambiar", "Change")}</span>}
                    </div>
                  ) : (
                    <div role="button" onClick={() => setBuscar("")} style={{ marginTop: 10, height: 50, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, border: "1.5px dashed rgba(11,14,18,.25)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "rgba(11,14,18,.55)" }}>
                      <Icon name="search" size={17} /><span style={{ font: "600 14px Manrope,sans-serif" }}>{E2("Busca el negocio que recomiendas", "Find the business you recommend")}</span>
                    </div>
                  )}
                  {buscar != null && (
                    <div data-screen-label="Publicar · buscar negocio" style={{ marginTop: 10, borderRadius: 14, border: "1px solid rgba(11,14,18,.12)", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderBottom: LINE }}>
                        <Icon name="search" size={16} color="rgba(11,14,18,.45)" />
                        <input autoFocus value={buscar} onChange={(e) => setBuscar(e.target.value.slice(0, 60))} placeholder={E2(`Negocios de ${yo.ciudad}`, `${yo.ciudad} businesses`)} aria-label={E2("Buscar negocio", "Search business")}
                          style={{ flex: 1, minWidth: 0, height: 44, border: "none", outline: "none", font: "600 14px Manrope,sans-serif", background: "transparent", color: "var(--tl-ink)" }} />
                        <span role="button" aria-label={E2("Cerrar", "Close")} onClick={() => setBuscar(null)} style={{ display: "grid", cursor: "pointer" }}><Icon name="close" size={15} color="rgba(11,14,18,.5)" /></span>
                      </div>
                      {hall.map((b) => (
                        <div key={b.id} role="option" aria-selected={biz?.id === b.id} onClick={() => { setBiz(b); setPara(null); setNoEsMio(false); setBuscar(null); setErr(null); }} style={{ padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", borderTop: LINE, cursor: "pointer" }}>
                          <span style={{ width: 36, height: 36, borderRadius: 10, background: b.foto ? `url("${b.foto}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{b.nombre}</div><div style={{ marginTop: 2, font: `600 9px ${MONO}`, letterSpacing: ".04em", color: "rgba(11,14,18,.5)" }}>{(es ? b.meta.es : b.meta.en).toUpperCase()}</div></div>
                        </div>))}
                      {buscar.trim().length >= 2 && !hall.length && <div style={{ padding: "12px", font: "500 12.5px Manrope,sans-serif", color: "rgba(11,14,18,.55)", borderTop: LINE }}>{E2("No encontramos ese negocio en la ciudad.", "We did not find that business in the city.")}</div>}
                    </div>
                  )}
                </div>
              )}
              {kind === "recomendacion" && biz && !ed && (
                <div data-screen-label="Publicar · no es mi negocio" role="checkbox" aria-checked={noEsMio} tabIndex={0} onClick={() => setNoEsMio(!noEsMio)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setNoEsMio(!noEsMio); } }}
                  style={{ marginTop: -6, borderRadius: 14, background: "var(--tl-white)", boxSizing: "border-box", border: `1.5px solid ${noEsMio ? "var(--tl-ink)" : "rgba(11,14,18,.2)"}`, padding: "13px 14px", display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
                  <span style={{ width: 22, height: 22, boxSizing: "border-box", borderRadius: 7, border: `1.5px solid ${noEsMio ? "var(--tl-ink)" : "rgba(11,14,18,.2)"}`, background: noEsMio ? "var(--tl-ink)" : "var(--tl-white)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="check" size={14} strokeWidth={2.4} color="var(--tl-white)" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.35 Manrope,sans-serif" }}>{E2("No es mi negocio y no trabajo ahí.", "It is not my business and I don't work there.")}</div><div style={{ marginTop: 3, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Si es tuyo, publícalo en las Novedades de tu negocio.", "If it is yours, post it in your business Updates.")}</div></div>
                </div>
              )}
              {kind === "recomendacion" && biz && biz.subs.length > 0 && (
                <div><div style={K("")}>{E2("¿PARA QUÉ LO RECOMIENDAS?", "WHAT FOR?")}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{biz.subs.map((s) => { const l = es ? s.es : s.en || s.es; return <Chip key={l} variant={para === l ? "selected" : "filter"} onClick={() => setPara(para === l ? null : l)}>{l}</Chip>; })}</div>
                </div>
              )}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><label htmlFor="com-texto" style={K("")}>{TX[kind][0]}</label><span style={{ font: `600 9.5px ${MONO}`, color: n >= MIN_TEXTO ? "var(--tl-open-text)" : "rgba(11,14,18,.45)" }}>{`${n} / ${MIN_TEXTO}+`}</span></div>
                <textarea id="com-texto" value={body} onChange={(e) => { setBody(e.target.value.slice(0, 1000)); setErr(null); }} placeholder={TX[kind][1]} rows={4} aria-invalid={!!err || undefined}
                  style={{ marginTop: 8, width: "100%", boxSizing: "border-box", minHeight: 108, padding: "12px 14px", borderRadius: 14, border: `1px solid ${err ? "var(--tl-danger)" : "rgba(11,14,18,.12)"}`, outline: "none", resize: "vertical", font: "500 14.5px/1.5 Manrope,sans-serif", color: "var(--tl-ink)", background: "var(--tl-white)" }} />
                {err && <div role="alert" style={{ marginTop: 8, padding: "11px 13px", borderRadius: 13, background: "rgba(192,57,43,.08)", display: "flex", gap: 9, alignItems: "flex-start" }}><span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="warning" size={15} color="var(--tl-danger)" /></span><span style={{ font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{es ? err.es : err.en}</span></div>}
                {emergencia && <div role="note" style={{ marginTop: 8, padding: "11px 13px", borderRadius: 13, background: "rgba(192,57,43,.08)", display: "flex", gap: 9, alignItems: "flex-start" }}><span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="emergency" size={15} color="var(--tl-danger)" /></span><span style={{ font: "700 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{es ? EMERGENCIA911.es : EMERGENCIA911.en}</span></div>}
              </div>
              {kind === "pregunta" && (
                <div><div style={K("")}>{E2("TEMA · OPCIONAL", "TOPIC · OPTIONAL")}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{TEMAS.map(([id, a, b]) => <Chip key={id} variant={topic === id ? "selected" : "filter"} onClick={() => setTopic(topic === id ? "" : id)}>{es ? a : b}</Chip>)}</div>
                  {topic === "salud" && <div style={{ marginTop: 8, font: "600 12px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{E2("Sale con el aviso: una recomendación no reemplaza al médico; si es una emergencia, llama al 911.", "It shows the notice: a recommendation does not replace a doctor; if it is an emergency, call 911.")}</div>}
                </div>
              )}
              {kind === "encuesta" && (
                <div><div style={K("")}>{E2("OPCIONES", "OPTIONS")}</div>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {opts.map((o, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={o} disabled={!!ed} onChange={(e) => { const a = opts.slice(); a[i] = e.target.value.slice(0, 60); setOpts(a); setErr(null); }} placeholder={E2(`Opción ${i + 1}`, `Option ${i + 1}`)} aria-label={E2(`Opción ${i + 1}`, `Option ${i + 1}`)} maxLength={60}
                          style={{ flex: 1, minWidth: 0, height: 44, boxSizing: "border-box", padding: "0 14px", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "600 14px Manrope,sans-serif", color: "var(--tl-ink)", background: "var(--tl-white)" }} />
                        {opts.length > 2 && !ed && <span role="button" aria-label={E2("Quitar opción", "Remove option")} onClick={() => setOpts(opts.filter((_, j) => j !== i))} style={{ width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={15} color="rgba(11,14,18,.5)" /></span>}
                      </div>))}
                    {opts.length < 4 && !ed && <span role="button" onClick={() => setOpts([...opts, ""])} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="plus" size={15} color="var(--tl-action)" />{E2("Agregar opción", "Add option")}</span>}
                  </div>
                  {!ed && <><div style={{ ...K(""), marginTop: 14 }}>{E2("DURA", "RUNS FOR")}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{DIAS_ENCUESTA.map((d) => <Chip key={d} variant={dias === d ? "selected" : "filter"} onClick={() => setDias(d)}>{d === 1 ? E2("1 día", "1 day") : E2(`${d} días`, `${d} days`)}</Chip>)}</div></>}
                </div>
              )}
              {kind !== "encuesta" && (
                <div><div style={K("")}>{E2("FOTOS · OPCIONAL", "PHOTOS · OPTIONAL")}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {fotos.map((f, i) => (
                      <span key={f.id} style={{ position: "relative", width: 64, height: 64, borderRadius: 13, background: `url("${f.url}") center/cover`, backgroundColor: "var(--tl-photo-bg)", flex: "none" }}>
                        <span role="button" aria-label={E2(`Quitar foto ${i + 1}`, `Remove photo ${i + 1}`)} onClick={() => setFotos(fotos.filter((x) => x.id !== f.id))} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 99, background: "rgba(11,14,18,.7)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="close" size={11} strokeWidth={2.2} color="var(--tl-white)" /></span>
                      </span>))}
                    {fotos.length < MAX_FOTOS && (
                      <label style={{ width: 64, height: 64, boxSizing: "border-box", borderRadius: 13, border: "1.5px dashed rgba(11,14,18,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", color: "rgba(11,14,18,.5)", flex: "none" }}>
                        <input type="file" accept="image/*" multiple hidden onChange={(e) => { void subir(e.target.files); e.target.value = ""; }} aria-label={E2("Agregar foto", "Add photo")} />
                        <Icon name="image" size={17} /><span style={{ font: `700 9px ${MONO}`, letterSpacing: ".06em" }}>{subiendo ? "…" : E2("FOTO", "PHOTO")}</span>
                      </label>)}
                  </div>
                  <div style={{ marginTop: 8, font: "500 11.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.5)" }}>{E2("Sin fotos de otras personas sin su permiso. Les quitamos la ubicación de la cámara.", "No photos of other people without their permission. We remove the camera location.")}</div>
                </div>
              )}
            </div>
            <div style={{ ...caja, padding: "13px 14px", display: "flex", gap: 11, alignItems: "center" }}>
              <span style={{ display: "grid", flex: "none" }}><Icon name="pin" size={18} color="var(--tl-action)" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13px/1.35 Manrope,sans-serif" }}>{E2(`Lo ven tus vecinos de ${ciudad}`, `Your ${ciudad} neighbors see it`)}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{yo.invitado ? E2(`SALE COMO INVITADO · DE ${yo.invitado.toUpperCase()}`, `SHOWS AS VISITOR · FROM ${yo.invitado.toUpperCase()}`) : E2("MI CIUDAD · SALE CON TU NOMBRE Y TU BARRIO, NUNCA TU DIRECCIÓN", "MY CITY · SHOWS YOUR NAME AND NEIGHBORHOOD, NEVER YOUR ADDRESS")}</div></div>
              <span role="button" onClick={() => ui.setHoja({ title: E2("Reglas del barrio", "Neighborhood rules"), listo: E2("Entendido", "Got it"), extra: <div style={{ marginTop: 12 }}><Reglas es={es} R={R} /></div> })} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", flex: "none" }}>{E2("Reglas", "Rules")}</span>
            </div>
            {D && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex" }}><Button variant="primary" disabled={!puede || busy} onClick={publicar}>{busy ? E2("Publicando…", "Posting…") : ed ? E2("Guardar cambios", "Save changes") : E2("Publicar", "Post")}</Button></div>
                <span style={{ font: `600 10px ${MONO}`, letterSpacing: ".06em", color: local ? "var(--tl-danger)" : "rgba(11,14,18,.5)" }}>{nota}</span>
              </div>
            )}
          </>
        )}
      </div>
      {!D && !bloqueada && (
        <div data-screen-label="Publicar · barra" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "10px 16px 26px" }}>
          <div style={{ marginBottom: 8, font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: local ? "var(--tl-danger)" : "rgba(11,14,18,.5)", textAlign: "center" }}>{nota}</div>
          <div style={{ display: "flex" }}><Button variant="primary" block disabled={!puede || busy} onClick={publicar}>{busy ? E2("Publicando…", "Posting…") : ed ? E2("Guardar cambios", "Save changes") : E2("Publicar", "Post")}</Button></div>
        </div>
      )}
    </Marco>
  );
}
