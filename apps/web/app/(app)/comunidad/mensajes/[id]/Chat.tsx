"use client";
/* APP-COM-CHAT (prototipo chatV): la persona arriba (rango · zona · «te sigue») que abre su perfil y el menú (ver perfil, silenciar,
   reportar conversación, bloquear); las burbujas (lo mío a la derecha en tinta, lo suyo a la izquierda en blanco; un mensaje oculto
   por To'Latino dice eso); «Ver anteriores» por cursor; la caja para escribir (fija abajo en el teléfono, en la columna en escritorio).
   Sin teléfonos ni datos (el servidor lo rechaza y aquí se dice por qué). Si no te sigue, se dice y no hay caja.
   Lo nuevo llega en vivo (9m).
   9t (19 nov) · Fotos y «Ver traducción», como el chat con un negocio (cuenta/mensajes/[negocio]/Chat.tsx): el IconButton «image» del composer sube
   la foto PRIVADA (/api/mensajes/foto con para=dm; la revisa el modelo propio) y la miniatura queda con «Quitar foto» hasta enviar; se puede mandar
   solo la foto. En la burbuja: la foto (180 × 140; se abre aparte), o «Foto en revisión» mientras To'Latino la revisa (quien la mandó la ve con
   «EN REVISIÓN»), o «Foto quitada por To’Latino». «Ver traducción» ES↔EN bajo lo de la otra persona que no está en tu idioma (useTraducir:
   traductor propio, caché y tope; el original se queda). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { subirFotoMensaje } from "@/lib/subir-foto";
import { LineaTr, useTraducir } from "../../../Traducir";
import { MAX_MENSAJE } from "@/lib/comunidad-filtro";
import { hace, rango } from "@/lib/comunidad-comun";
import type { Conversacion, MsjV } from "@/lib/mensajes-vecinos";
import { dmAnteriores, dmEnviar, dmNuevos, dmReportar } from "../../acciones";
import { Avatar, LINE, MONO, Marco, useAncho, useComUi, type ComUi, type YoCom } from "../../Marco";
import { useVecinoAcciones } from "../../vecinoAcciones";
import { abrirReporte } from "../../Reportar";
import { useMensajesVivo } from "@/lib/vivo-cliente";
import { LINEA988 } from "@/lib/moderacion-comun";

import { tec } from "@/lib/tec";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { fotoFondo } from "@tolatino/ui";
type N = "Icon" | "Button" | "IconButton";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, IconButton } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function Chat({ es, yo, ciudad, c }: { es: boolean; yo: YoCom; ciudad: string; c: Conversacion | null }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024;
  const vec = useVecinoAcciones(es, ui);
  const [msjs, setMsjs] = useState<MsjV[]>(c?.msjs ?? []), [mas, setMas] = useState(c?.mas ?? null);
  const [t, setT] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const fin = useRef<HTMLDivElement | null>(null), file = useRef<HTMLInputElement>(null), tr = useTraducir(es);
  const [foto, setFoto] = useState<{ id: string; url: string; revision: boolean } | null>(null), [subiendo, setSubiendo] = useState(false);
  const subir = async (f: File) => {
    if (!/^image\//.test(f.type)) return ui.setAviso({ t: E2("Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.") });
    setSubiendo(true); setErr(null);
    const r = await subirFotoMensaje(f, "dm").catch(() => ({ ok: false as const, mensaje: undefined, revision: false, id: undefined, url: undefined }));
    setSubiendo(false);
    if (r.ok && r.id && r.url) setFoto({ id: r.id, url: r.url, revision: !!r.revision });
    else ui.setAviso({ t: r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "The photo could not be uploaded.") });
  };
  useEffect(() => { setMsjs(c?.msjs ?? []); setMas(c?.mas ?? null); }, [c]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [msjs.length]);
  // 9m · Lo nuevo de la otra persona llega en vivo (SSE propio, /api/vivo): el aviso dice qué conversación y aquí se trae; al conectarse, una vez.
  const traer = useRef<() => void>(() => undefined);
  traer.current = () => {
    if (!c) return;
    // 9t · Si hay una foto en revisión, se trae desde ella (el aviso en vivo también llega cuando To'Latino la decide) y lo que cambió se reemplaza.
    const rev = msjs.find((m) => m.fotoEst === "revision"), ult = rev ? String(Math.max(0, Number(rev.id) - 1)) : msjs.at(-1)?.id ?? "0";
    void dmNuevos(c.otro.id, ult).catch(() => null).then((r) => {
      if (r && r.ok && "msjs" in r && r.msjs.length) setMsjs((L) => [...L.map((y) => r.msjs.find((x) => x.id === y.id) ?? y), ...r.msjs.filter((m) => !L.some((x) => x.id === m.id))]);
      if (r && !r.ok) router.refresh();
    });
  };
  useMensajesVivo({ apagado: !c, on: (x) => { if (x.k === "dm" && x.con === c?.otro.id) traer.current(); }, listo: () => traer.current() });

  if (!c) {
    return (
      <Marco es={es} yo={yo} ui={ui} code="APP-COM-CHAT" titulo={E2("Mensajes", "Messages")} sub={ciudad.toUpperCase()} back="/comunidad/mensajes">
        <div data-screen-label="APP-COM-CHAT · no está" style={{ margin: D ? 0 : "14px 16px", maxWidth: 720, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 18 }}>
          <div style={{ font: "800 18px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("No encontramos esta conversación", "We could not find this conversation")}</div>
          <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2("Puede que esta persona ya no esté en la Comunidad.", "This person may no longer be in the Community.")}</div>
          <div style={{ marginTop: 14, display: "flex" }}><Button variant="secondary" size="md" icon="chevronLeft" onClick={() => router.push("/comunidad/mensajes")}>{E2("Volver a Mensajes", "Back to Messages")}</Button></div>
        </div>
      </Marco>
    );
  }
  const o = c.otro, rk = rango(o.rango);
  const meta = [es ? rk.es : rk.en, o.zona ? (es ? o.zona.es : o.zona.en) : null, o.meSigue ? E2("te sigue", "follows you") : null].filter(Boolean).join(" · ").toUpperCase();
  const enviar = async () => {
    const x = t.trim();
    if ((!x && !foto) || busy || subiendo) return;
    setBusy(true); setErr(null);
    const r = await dmEnviar(o.id, x, foto?.id ?? null).catch(() => null);
    setBusy(false);
    if (!r) return setErr(E2("No se pudo enviar. Revisa tu conexión.", "Could not send. Check your connection."));
    if (!r.ok) return setErr(r.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo enviar.", "Could not send."));
    if ("msj" in r) setMsjs((L) => [...L, r.msj]);
    if ("crisis" in r && r.crisis) ui.setAviso({ t: es ? LINEA988.es : LINEA988.en, ms: 14000 });
    else if ("revision" in r && r.revision) ui.setAviso({ t: E2("Tu foto se ve cuando To’Latino la revise.", "Your photo shows once To’Latino reviews it.") });
    setT(""); setFoto(null);
  };
  const listo = !!t.trim() || !!foto;
  const anteriores = async () => {
    if (!mas || busy) return; setBusy(true);
    const r = await dmAnteriores(o.id, mas).catch(() => null); setBusy(false);
    if (r && r.ok && "msjs" in r) { setMsjs((L) => [...r.msjs.filter((m) => !L.some((x) => x.id === m.id)), ...L]); setMas(r.mas); }
  };
  const menu = () => ui.setHoja({ title: o.nombre, rows: [
    { t: E2("Ver perfil", "See profile"), ic: "users", on: () => { ui.setHoja(null); router.push(`/comunidad/v/${o.id}`); } },
    { t: E2("Silenciar conversación", "Mute conversation"), s: E2("Te siguen llegando sus mensajes, sin aviso. No se entera.", "Their messages still arrive, without a notice. They won't know."), ic: "bell", on: () => { ui.setHoja(null); void vec.silenciar(o.id, o.nombre); } },
    { t: E2("Reportar conversación", "Report conversation"), s: E2("Mandamos la conversación a revisión.", "We send the conversation for review."), ic: "warning", peligro: true, on: () => abrirReporte(ui, es, { motivos: MOTIVOS_CHAT, enviar: (m, n) => dmReportar(o.id, m, n),
      despues: { es: "Lo revisamos en 48 h. Solo con tu reporte el equipo puede leer esta conversación. Si te sientes en peligro, bloquéala.", en: "We review it within 48 h. Only with your report can the team read this conversation. If you feel unsafe, block them." } }) },
    { t: E2(`Bloquear a ${primero(o.nombre)}`, `Block ${primero(o.nombre)}`), s: E2("No te ve ni te puede escribir.", "They can't see you or message you."), ic: "ban", peligro: true, on: () => vec.bloquear(o.id, o.nombre, () => router.push("/comunidad/mensajes"), () => router.push(`/comunidad/mensajes/${o.id}`)) },
  ] });
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-CHAT" titulo={o.nombre} sub={meta} back="/comunidad/mensajes">
      <div data-screen-label="APP-COM-CHAT · conversación" style={{ padding: D ? 0 : "14px 16px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <div role="link" onClick={() => router.push(`/comunidad/v/${o.id}`)} {...tec(() => router.push(`/comunidad/v/${o.id}`))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", borderRadius: 99, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", cursor: "pointer", minWidth: 0 }}>
            <Avatar foto={o.foto} ini={o.ini} size={26} />
            <span style={{ font: `600 10px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>
          </div>
          <IconButton icon="chevronDown" size={34} label={E2("Opciones", "Options")} onClick={menu} />
        </div>
        {mas && <div style={{ display: "flex", justifyContent: "center" }}><Button variant="ghost" size="sm" disabled={busy} onClick={anteriores}>{E2("Ver anteriores", "See earlier")}</Button></div>}
        {msjs.map((m) => {
          // 9t · «Ver traducción» solo en lo de la otra persona (lo tuyo no se traduce) y si el texto no está en tu idioma; el original se queda.
          const x = m.oculto ? { body: m.t, translate: undefined } : tr("dm_message", m.id, m.lang, m.t, m.mio);
          const quitada = m.fotoEst === "quitada" && !m.t, suave = m.oculto || quitada;
          const fotoL = m.foto || !m.fotoEst || m.fotoEst === "quitada" || m.oculto ? null : m.fotoEst === "revision" ? E2("Foto en revisión", "Photo under review") : E2("Foto", "Photo");
          return (
            <div key={m.id} data-screen-label="Chat · mensaje" data-msg-foto={m.foto || fotoL ? (m.foto ? "si" : "espera") : undefined} style={{ display: "flex", flexDirection: "column", alignItems: m.mio ? "flex-end" : "flex-start", gap: 3 }}>
              <div style={{ maxWidth: "78%", padding: "10px 13px", borderRadius: m.mio ? "18px 18px 6px 18px" : "18px 18px 18px 6px", background: suave ? "rgba(11,14,18,.05)" : m.mio ? "var(--tl-ink)" : "var(--tl-white)",
                color: suave ? "rgba(11,14,18,.6)" : m.mio ? "var(--tl-white)" : "var(--tl-ink)", border: m.mio || suave ? "none" : "1px solid rgba(11,14,18,.08)", font: `${suave ? "600 13px" : "500 14px"}/1.45 Manrope,sans-serif`, textWrap: "pretty", whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                display: "flex", flexDirection: "column", gap: 8 }}>
                {!m.oculto && m.foto ? <a href={m.foto} target="_blank" rel="noopener noreferrer" aria-label={E2("Foto", "Photo")} style={{ display: "block", width: 180, height: 140, maxWidth: "100%", borderRadius: 10, background: `${fotoFondo(m.foto, 180)} center/cover`, backgroundColor: "var(--tl-photo-bg)" }} />
                  : fotoL ? <span role="img" aria-label={fotoL} style={{ width: 180, height: 140, maxWidth: "100%", borderRadius: 10, background: "var(--tl-photo-bg)", display: "grid", placeItems: "center", gap: 6, alignContent: "center", textAlign: "center", padding: 10, boxSizing: "border-box", color: "rgba(11,14,18,.6)", font: "600 12px/1.35 Manrope,sans-serif" }}><Icon name="image" size={20} color="rgba(11,14,18,.6)" />{fotoL}</span> : null}
                {m.oculto ? <span>{E2("Mensaje oculto por To'Latino", "Message hidden by To'Latino")}</span> : quitada ? <span>{E2("Foto quitada por To’Latino.", "Photo removed by To’Latino.")}</span> : x.body ? <span>{x.body}</span> : null}
              </div>
              {x.translate ? <LineaTr t={x.translate} mt={0} /> : null}
              <span style={{ font: `600 8.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.6)" }}>{m.fotoEst === "revision" && m.mio ? E2("EN REVISIÓN · ", "UNDER REVIEW · ") : ""}{hace(m.at, es).toUpperCase()}</span>
            </div>
          );
        })}
        {!msjs.length && c.puede && <div style={{ textAlign: "center", font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(`Escríbele a ${primero(o.nombre)}. Texto o una foto, sin teléfonos ni datos.`, `Write to ${primero(o.nombre)}. Text or a photo, no phone numbers or personal details.`)}</div>}
        {!c.puede && c.motivo && <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(11,14,18,.05)", font: "600 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textAlign: "center" }}>{es ? c.motivo.es : c.motivo.en}</div>}
        <div ref={fin} style={{ height: D ? 0 : c.puede ? (foto ? 156 : 96) : 0 }} />
        {c.puede && (
          <div data-screen-label="Chat · escribir" style={D ? { marginTop: 8, padding: 12, borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)" }
            : { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: LINE, padding: "10px 14px 26px" }}>
            {err && <div role="alert" style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 12, background: "rgba(192,57,43,.08)", font: "600 12.5px/1.4 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</div>}
            {foto && (
              <div data-chat-adjunto="" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 48, height: 48, borderRadius: 10, flex: "none", background: `${fotoFondo(foto.url, 48)} center/cover`, backgroundColor: "var(--tl-photo-bg)" }} />
                <span role="button" onClick={() => setFoto(null)} {...tec(() => setFoto(null))} style={{ font: "700 12.5px Manrope,sans-serif", color: "rgba(11,14,18,.6)", cursor: "pointer", flex: "none" }}>{E2("Quitar foto", "Remove photo")}</span>
                {foto.revision && <span style={{ font: "500 11.5px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)", minWidth: 0 }}>{E2("To’Latino la revisa antes de que se vea.", "To’Latino reviews it before it shows.")}</span>}
              </div>
            )}
            <input ref={file} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = ""; }} />
            <form onSubmit={(e) => { e.preventDefault(); void enviar(); }} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <IconButton icon="image" size={42} label={E2("Agregar una foto", "Add a photo")} onClick={() => { if (!subiendo) file.current?.click(); }} />
              <input value={t} onChange={(e) => { setT(e.target.value.slice(0, MAX_MENSAJE)); if (err) setErr(null); }} aria-label={E2("Tu mensaje", "Your message")} placeholder={subiendo ? E2("Subiendo la foto…", "Uploading the photo…") : E2("Escribe un mensaje…", "Write a message…")}
                style={{ flex: 1, minWidth: 0, height: 42, boxSizing: "border-box", padding: "0 13px", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "500 14px Manrope,sans-serif", background: "var(--tl-white)", color: "var(--tl-ink)" }} />
              <button type="submit" aria-label={E2("Enviar", "Send")} disabled={!listo || busy || subiendo} style={{ width: 42, height: 42, borderRadius: 13, border: 0, background: listo ? "var(--tl-ink)" : "rgba(11,14,18,.22)", display: "grid", placeItems: "center", cursor: listo ? "pointer" : "default", flex: "none" }}>
                <Icon name="right" size={18} strokeWidth={2} color="var(--tl-white)" />
              </button>
            </form>
          </div>
        )}
      </div>
    </Marco>
  );
}

/* 5c · Motivos para reportar una conversación (5d: el mismo flujo de tres pasos que lo demás, ./Reportar.tsx). */
const MOTIVOS_CHAT: [string, Bi][] = [["acoso", { es: "Acoso o amenazas", en: "Harassment or threats" }], ["spam", { es: "Spam o ventas", en: "Spam or sales" }], ["priv", { es: "Pide o comparte datos privados", en: "Asks for or shares private details" }], ["otro", { es: "Otra cosa", en: "Something else" }]];
