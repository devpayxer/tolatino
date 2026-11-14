"use client";
/* APP-COM-CHAT (prototipo chatV): la persona arriba (rango · zona · «te sigue») que abre su perfil y el menú (ver perfil, silenciar,
   reportar conversación, bloquear); las burbujas (lo mío a la derecha en tinta, lo suyo a la izquierda en blanco; un mensaje oculto
   por To'Latino dice eso); «Ver anteriores» por cursor; la caja para escribir (fija abajo en el teléfono, en la columna en escritorio).
   Solo texto: sin teléfonos ni datos (el servidor lo rechaza y aquí se dice por qué). Si no te sigue, se dice y no hay caja.
   Con la pantalla abierta pregunta cada 5 s si llegó algo. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
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
type N = "Icon" | "Button" | "IconButton";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, IconButton } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function Chat({ es, yo, ciudad, c }: { es: boolean; yo: YoCom; ciudad: string; c: Conversacion | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024;
  const vec = useVecinoAcciones(es, ui);
  const [msjs, setMsjs] = useState<MsjV[]>(c?.msjs ?? []), [mas, setMas] = useState(c?.mas ?? null);
  const [t, setT] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const fin = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setMsjs(c?.msjs ?? []); setMas(c?.mas ?? null); }, [c]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [msjs.length]);
  // 9m · Lo nuevo de la otra persona llega en vivo (SSE propio, /api/vivo): el aviso dice qué conversación y aquí se trae; al conectarse, una vez.
  const traer = useRef<() => void>(() => undefined);
  traer.current = () => {
    if (!c) return;
    const ult = msjs.at(-1)?.id ?? "0";
    void dmNuevos(c.otro.id, ult).catch(() => null).then((r) => {
      if (r && r.ok && "msjs" in r && r.msjs.length) setMsjs((L) => [...L, ...r.msjs.filter((m) => !L.some((x) => x.id === m.id))]);
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
    if (!x || busy) return;
    setBusy(true); setErr(null);
    const r = await dmEnviar(o.id, x).catch(() => null);
    setBusy(false);
    if (!r) return setErr(E2("No se pudo enviar. Revisa tu conexión.", "Could not send. Check your connection."));
    if (!r.ok) return setErr(r.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo enviar.", "Could not send."));
    if ("msj" in r) setMsjs((L) => [...L, r.msj]);
    if ("crisis" in r && r.crisis) ui.setAviso({ t: es ? LINEA988.es : LINEA988.en, ms: 14000 });
    setT("");
  };
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
        {msjs.map((m) => (
          <div key={m.id} data-screen-label="Chat · mensaje" style={{ display: "flex", flexDirection: "column", alignItems: m.mio ? "flex-end" : "flex-start", gap: 3 }}>
            <div style={{ maxWidth: "78%", padding: "10px 13px", borderRadius: m.mio ? "18px 18px 6px 18px" : "18px 18px 18px 6px", background: m.oculto ? "rgba(11,14,18,.05)" : m.mio ? "var(--tl-ink)" : "var(--tl-white)",
              color: m.oculto ? "rgba(11,14,18,.55)" : m.mio ? "var(--tl-white)" : "var(--tl-ink)", border: m.mio || m.oculto ? "none" : "1px solid rgba(11,14,18,.08)", font: `${m.oculto ? "600 13px" : "500 14px"}/1.45 Manrope,sans-serif`, textWrap: "pretty", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {m.oculto ? E2("Mensaje oculto por To'Latino", "Message hidden by To'Latino") : m.t}
            </div>
            <span style={{ font: `600 8.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.42)" }}>{hace(m.at, es).toUpperCase()}</span>
          </div>
        ))}
        {!msjs.length && c.puede && <div style={{ textAlign: "center", font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{E2(`Escríbele a ${primero(o.nombre)}. Solo texto.`, `Write to ${primero(o.nombre)}. Text only.`)}</div>}
        {!c.puede && c.motivo && <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(11,14,18,.05)", font: "600 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textAlign: "center" }}>{es ? c.motivo.es : c.motivo.en}</div>}
        <div ref={fin} style={{ height: D ? 0 : c.puede ? 96 : 0 }} />
        {c.puede && (
          <div data-screen-label="Chat · escribir" style={D ? { marginTop: 8, padding: 12, borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)" }
            : { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: LINE, padding: "10px 14px 26px" }}>
            {err && <div role="alert" style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 12, background: "rgba(192,57,43,.08)", font: "600 12.5px/1.4 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</div>}
            <form onSubmit={(e) => { e.preventDefault(); void enviar(); }} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input value={t} onChange={(e) => { setT(e.target.value.slice(0, MAX_MENSAJE)); if (err) setErr(null); }} aria-label={E2("Tu mensaje", "Your message")} placeholder={E2("Escribe un mensaje…", "Write a message…")}
                style={{ flex: 1, minWidth: 0, height: 42, boxSizing: "border-box", padding: "0 13px", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "500 14px Manrope,sans-serif", background: "var(--tl-white)", color: "var(--tl-ink)" }} />
              <button type="submit" aria-label={E2("Enviar", "Send")} disabled={!t.trim() || busy} style={{ width: 42, height: 42, borderRadius: 13, border: 0, background: t.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.22)", display: "grid", placeItems: "center", cursor: t.trim() ? "pointer" : "default", flex: "none" }}>
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
