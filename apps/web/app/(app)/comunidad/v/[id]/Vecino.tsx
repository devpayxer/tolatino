"use client";
/* APP-COM-VECINO · el perfil de un vecino (prototipo userV; la tarjeta de vecino 2s): foto, nombre y «Le dicen …», rango, presentación,
   zona y «en {ciudad} desde», fundador, publicaciones · seguidores · siguiendo (ocultables), y Seguir · Mensaje (solo si te sigue o ya
   te escribió) · menú (silenciar, bloquear). Mi perfil: editar presentación, cómo me dicen, desde cuándo y ocultar mis cuentas; Siguiendo,
   Seguidores, Bloqueados y silenciados y Mensajes. Abajo, lo que publicó (20 por página con cursor). El servidor decide todo. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { MAX_APODO, MAX_BIO } from "@/lib/comunidad-filtro";
import { rango, type Pub } from "@/lib/comunidad-comun";
import type { Vecino as V } from "@/lib/vecinos";
import { vecPerfil, vecPublicaciones, vecSeguir, comReportar } from "../../acciones";
import { abrirReporte } from "../../Reportar";
import { LINE, MONO, Marco, useAncho, useComUi, type ComUi, type YoCom } from "../../Marco";
import { useAccionesPub } from "../../Muro";
import { Tarjeta } from "../../Tarjeta";
import { useTraducir } from "../../../Traducir";
import { useVecinoAcciones } from "../../vecinoAcciones";

type N = "Icon" | "Button" | "IconButton" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, IconButton, Tag } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
type R = { ok: boolean; msg?: Bi; entrar?: boolean };
const CARD = { borderRadius: 20, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)" } as const;
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function Vecino({ es, yo, ciudad, v, bloqueado }: { es: boolean; yo: YoCom; ciudad: string; v: V | null; bloqueado: { id: string; nombre: string } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024, tr = useTraducir(es);
  const vec = useVecinoAcciones(es, ui);
  const [sigo, setSigo] = useState(v?.yoSigo ?? false), [pubs, setPubs] = useState<Pub[]>(v?.pubs ?? []), [mas, setMas] = useState(v?.mas ?? null), [busy, setBusy] = useState(false);
  useEffect(() => { setSigo(v?.yoSigo ?? false); setPubs(v?.pubs ?? []); setMas(v?.mas ?? null); }, [v]);
  const acc = useAccionesPub(es, ui, (id, f) => setPubs((L) => L.flatMap((p) => { if (p.id !== id) return [p]; const n = f(p); return n ? [n] : []; })), undefined, () => router.refresh());
  const red: R = { ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } };
  const fallo = (r: R) => { if (r.msg) ui.setAviso({ t: es ? r.msg.es : r.msg.en }); };
  const margen = D ? 0 : "14px 16px 0";

  if (!v) {
    return (
      <Marco es={es} yo={yo} ui={ui} code="APP-COM-VECINO" titulo={bloqueado ? bloqueado.nombre : E2("Vecino", "Neighbor")} sub={ciudad.toUpperCase()} back="/comunidad">
        <div data-screen-label="APP-COM-VECINO · no está" style={{ ...CARD, margin: margen, maxWidth: 720, padding: 18 }}>
          <div style={{ font: "800 18px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{bloqueado ? E2(`Bloqueaste a ${bloqueado.nombre}`, `You blocked ${bloqueado.nombre}`) : E2("No encontramos a este vecino", "We could not find this neighbor")}</div>
          <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>
            {bloqueado ? E2("No ves lo que publica y no te puede escribir. No le avisamos.", "You don't see their posts and they can't message you. We didn't tell them.") : E2("Puede que ya no esté en la Comunidad.", "They may no longer be in the Community.")}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bloqueado && <Button variant="primary" size="md" onClick={vec.deshacer(bloqueado.id, "block")}>{E2("Desbloquear", "Unblock")}</Button>}
            <Button variant="secondary" size="md" icon="chevronLeft" onClick={() => router.push("/comunidad")}>{E2("Volver a la Comunidad", "Back to the Community")}</Button>
          </div>
        </div>
      </Marco>
    );
  }

  const rk = rango(v.rango);
  const seguir = async () => {
    if (busy) return; setBusy(true);
    const r = await vecSeguir(v.id, !sigo).catch(() => red); setBusy(false);
    if (!r.ok) return fallo(r);
    setSigo(!sigo);
    ui.setAviso({ t: !sigo ? E2(`Sigues a ${primero(v.nombre)}. Lo que publique sale en Siguiendo.`, `You follow ${primero(v.nombre)}. Their posts show in Following.`) : E2(`Dejaste de seguir a ${primero(v.nombre)}.`, `You unfollowed ${primero(v.nombre)}.`) });
    router.refresh();
  };
  const menu = () => ui.setHoja({ title: v.nombre, rows: [
    v.silenciado
      ? { t: E2(`Quitar el silencio a ${primero(v.nombre)}`, `Unmute ${primero(v.nombre)}`), s: E2("Vuelves a ver lo que publica.", "You see their posts again."), ic: "bell", on: () => { ui.setHoja(null); void vec.deshacer(v.id, "mute")(); } }
      : { t: E2(`Silenciar a ${primero(v.nombre)}`, `Mute ${primero(v.nombre)}`), s: E2("No verás lo que publica. No se entera.", "You won't see their posts. They won't know."), ic: "bell", on: () => { ui.setHoja(null); void vec.silenciar(v.id, v.nombre, () => router.refresh()); } },
    { t: E2(`Bloquear a ${primero(v.nombre)}`, `Block ${primero(v.nombre)}`), s: E2("No te ve ni te puede escribir.", "They can't see you or message you."), ic: "ban", peligro: true, on: () => vec.bloquear(v.id, v.nombre, () => router.refresh()) },
    // 5d · Reportar a una persona (hueco #4): la silencia para quien reporta y abre un caso en «Reportes de usuario».
    { t: E2(`Reportar a ${primero(v.nombre)}`, `Report ${primero(v.nombre)}`), s: E2("Dejas de ver lo que publica. Lo revisamos en 48 h.", "You stop seeing their posts. We review it within 48 h."), ic: "warning", peligro: true, sep: true,
      on: () => abrirReporte(ui, es, { enviar: (m, n) => comReportar("user", v.id, m, n), despues: { es: "Ya no ves lo que publica. Lo revisamos en 48 h.", en: "You won't see their posts anymore. We review it within 48 h." }, alHecho: () => router.refresh() }) },
  ] });
  const meta = [v.zona ? (es ? v.zona.es : v.zona.en) : null, v.ciudad, v.desde && v.ciudad ? E2(`EN ${v.ciudad.split(",")[0]!.toUpperCase()} DESDE ${v.desde}`, `IN ${v.ciudad.split(",")[0]!.toUpperCase()} SINCE ${v.desde}`) : null].filter(Boolean).join(" · ").toUpperCase();
  const stats = v.cuentas ? [[v.cuentas.publicaciones, E2("PUBLICACIONES", "POSTS")], [v.cuentas.seguidores, E2("SEGUIDORES", "FOLLOWERS")], [v.cuentas.siguiendo, E2("SIGUIENDO", "FOLLOWING")]] as [number, string][] : null;
  const verMas = async () => {
    if (!mas || busy) return; setBusy(true);
    const r = await vecPublicaciones(v.id, mas).catch(() => null); setBusy(false);
    if (r && r.ok && "pubs" in r) { setPubs((L) => [...L, ...r.pubs.filter((p) => !L.some((x) => x.id === p.id))]); setMas(r.mas); } else ui.setAviso({ t: E2("No se pudo cargar. Revisa tu conexión.", "Could not load. Check your connection.") });
  };
  return (
    <Marco es={es} yo={yo} ui={ui} code={v.yo ? "APP-COM-VECINO · yo" : "APP-COM-VECINO"} titulo={v.yo ? E2("Mi perfil", "My profile") : v.nombre} sub={`${(es ? rk.es : rk.en).toUpperCase()} · ${(v.ciudad ?? ciudad).toUpperCase()}`} back="/comunidad">
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
        <div data-screen-label="APP-COM-VECINO · perfil" style={{ ...CARD, margin: margen, padding: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ width: 76, height: 76, boxSizing: "border-box", borderRadius: 99, border: v.fundador ? "2.5px solid var(--tl-signal)" : "none", backgroundColor: "var(--tl-desk)", backgroundImage: v.foto ? `url("${v.foto}")` : undefined, backgroundSize: "cover", backgroundPosition: "center", display: "grid", placeItems: "center", font: "800 22px Sora,sans-serif", flex: "none" }}>{v.foto ? "" : v.ini}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, font: "800 22px/1.15 Sora,sans-serif", letterSpacing: "-.03em" }}>{v.nombre}</h2>
              {v.apodo && <div style={{ marginTop: 3, font: "600 13px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(`Le dicen «${v.apodo}»`, `Goes by «${v.apodo}»`)}</div>}
              <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(75,55,245,.1)", display: "inline-grid", placeItems: "center", font: "800 11px/1 Sora,sans-serif", color: "var(--tl-action)" }}>{v.rango}</span>
                <span style={{ font: `700 10px ${MONO}`, letterSpacing: ".12em", color: "var(--tl-action)" }}>{(es ? rk.es : rk.en).toUpperCase()}</span>
              </div>
            </div>
          </div>
          {v.bio && <div style={{ marginTop: 12, font: "500 13.5px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.75)", textWrap: "pretty", whiteSpace: "pre-wrap" }}>{v.bio}</div>}
          {meta && <div style={{ marginTop: 10, font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{meta}</div>}
          {v.fundador && <div style={{ marginTop: 10, display: "flex" }}><Tag tone="action">{v.yo ? E2(`FUNDADORES · #${v.fundador.toLocaleString("en-US")}`, `FOUNDERS · #${v.fundador.toLocaleString("en-US")}`) : E2(`FUNDADOR DE ${(v.ciudad ?? ciudad).split(",")[0]!.toUpperCase()}`, `${(v.ciudad ?? ciudad).split(",")[0]!.toUpperCase()} FOUNDER`)}</Tag></div>}
          {stats && (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {stats.map(([n, l]) => (
                <div key={l} role={v.yo && l !== stats[0]![1] ? "link" : undefined} onClick={v.yo && l !== stats[0]![1] ? () => router.push(`/cuenta/vecinos?l=${l === stats[1]![1] ? "seguidores" : "siguiendo"}`) : undefined}
                  style={{ padding: 10, borderRadius: 13, background: "var(--tl-paper)", cursor: v.yo && l !== stats[0]![1] ? "pointer" : "default" }}>
                  <div style={{ font: "800 18px/1 Sora,sans-serif", letterSpacing: "-.02em" }}>{n.toLocaleString("en-US")}</div>
                  <div style={{ marginTop: 5, font: `700 8.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>{l}</div>
                </div>))}
            </div>
          )}
          {!v.yo && (
            <>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <div style={{ display: "flex", flex: 1 }}><Button variant={sigo ? "secondary" : "primary"} size="md" block icon="users" disabled={busy} onClick={seguir}>{sigo ? E2("Siguiendo", "Following") : E2("Seguir", "Follow")}</Button></div>
                <div style={{ display: "flex", flex: 1 }}><Button variant="secondary" size="md" block icon="chat" disabled={!v.puedeEscribir} onClick={() => router.push(`/comunidad/mensajes/${v.id}`)}>{E2("Mensaje", "Message")}</Button></div>
                <IconButton icon="chevronDown" size={40} label={E2("Opciones", "Options")} onClick={menu} />
              </div>
              {!v.puedeEscribir && <div style={{ marginTop: 8, font: "500 11.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{E2(`Solo puedes escribirle si ${primero(v.nombre)} te sigue.`, `You can only message ${primero(v.nombre)} if they follow you.`)}</div>}
            </>
          )}
        </div>
        {v.silenciado && (
          <div data-screen-label="APP-COM-VECINO · silenciado" role="note" style={{ margin: margen, padding: "12px 14px", borderRadius: 14, background: "rgba(11,14,18,.05)", display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="bell" size={16} />
            <span style={{ flex: 1, font: "600 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.7)" }}>{E2(`Silenciaste a ${primero(v.nombre)}: no ves lo que publica ni comenta. No se entera.`, `You muted ${primero(v.nombre)}: you don't see their posts or comments. They don't know.`)}</span>
            <span role="button" onClick={vec.deshacer(v.id, "mute")} style={{ font: "800 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Quitar", "Undo")}</span>
          </div>
        )}
        {v.yo && <MisEnlaces es={es} v={v} ui={ui} margen={margen} />}
        {v.insignias.length > 0 && (
          <div data-screen-label="APP-COM-VECINO · insignias" style={{ ...CARD, borderRadius: 18, margin: margen, padding: 16 }}>
            <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>{E2("INSIGNIAS", "BADGES")}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {v.insignias.map((b) => (
                <div key={b.k} style={{ padding: "11px 12px", borderRadius: 13, background: "var(--tl-paper)", display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="star" size={15} color="var(--tl-pro-ink)" /></span>
                  <div style={{ minWidth: 0 }}><div style={{ font: "700 12.5px/1.3 Manrope,sans-serif" }}>{es ? b.t.es : b.t.en}</div><div style={{ marginTop: 3, font: "500 11px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{es ? b.s.es : b.s.en}</div></div>
                </div>))}
            </div>
          </div>
        )}
        <div data-screen-label="APP-COM-VECINO · publicaciones" style={{ background: "var(--tl-white)", overflow: "hidden" }} className="lg:rounded-[20px] lg:border lg:border-ink/[.08]">
          <div style={{ padding: "14px 20px", borderBottom: LINE, font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>{v.yo ? E2("LO QUE PUBLICASTE", "WHAT YOU POSTED") : E2("LO QUE PUBLICÓ", "WHAT THEY POSTED")}</div>
          {pubs.map((p) => (
            <Tarjeta key={p.id} p={p} es={es} tr={tr} onOpen={() => router.push(`/comunidad/p/${p.id}`)} onMenu={() => acc.menu(p)} onVote={(x) => void acc.votar(p, x)} onPoll={(i) => void acc.encuesta(p, i)}
              onSave={() => void acc.guardar(p)} onShare={() => void acc.compartir(p)} onBiz={(id) => router.push(`/n/${id}`)} />
          ))}
          {!pubs.length && (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ font: "800 16px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{v.silenciado ? E2("Lo silenciaste", "You muted them") : v.yo ? E2("Todavía no has publicado", "You have not posted yet") : E2("Todavía no hay nada aquí", "Nothing here yet")}</div>
              <div style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{v.silenciado ? E2("Quita el silencio para ver lo que publica.", "Unmute them to see their posts.") : v.yo ? E2("Pregunta o recomienda a alguien: los puntos llegan cuando otros votan.", "Ask or recommend someone: points come when others vote.") : E2(`${primero(v.nombre)} todavía no ha publicado.`, `${primero(v.nombre)} has not posted yet.`)}</div>
              {v.yo && <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="plus" onClick={() => router.push("/comunidad/nuevo")}>{E2("Publicar", "Post")}</Button></div>}
            </div>
          )}
          {mas && <div style={{ padding: "16px 20px 20px", display: "flex", justifyContent: "center" }}><Button variant="secondary" size="md" disabled={busy} onClick={verMas}>{busy ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div>}
        </div>
      </div>
    </Marco>
  );
}

/* Mi perfil: editar lo mío y mis listas (Mi cuenta › Siguiendo · Seguidores · Bloqueados y silenciados) y Mensajes. */
function MisEnlaces({ es, v, ui, margen }: { es: boolean; v: V; ui: ComUi; margen: string | number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const filas: [string, string, string, () => void][] = [
    ["shield", es ? rango(v.rango).es : rango(v.rango).en, E2(`${v.puntos.toLocaleString("en-US")} PUNTOS · TU RANGO Y LA TABLA`, `${v.puntos.toLocaleString("en-US")} POINTS · YOUR RANK AND THE BOARD`), () => router.push("/comunidad/rango")],
    ["ticket", E2(`${(v.monedas ?? 0).toLocaleString("en-US")} monedas`, `${(v.monedas ?? 0).toLocaleString("en-US")} coins`), E2("CUPONES DEL BARRIO · SIN VALOR EN DINERO", "NEIGHBORHOOD COUPONS · NO CASH VALUE"), () => router.push("/comunidad/monedas")],
    ["edit", E2("Editar mi perfil", "Edit my profile"), E2("PRESENTACIÓN, CÓMO TE DICEN Y DESDE CUÁNDO", "INTRO, NICKNAME AND SINCE WHEN"), () => ui.setHoja({ title: E2("Mi perfil", "My profile"), sub: E2("Lo ven los vecinos con cuenta. Sin teléfonos, correos ni direcciones.", "Neighbors with an account see it. No phones, emails or addresses."), extra: <Editar es={es} v={v} ui={ui} /> })],
    ["users", E2("Siguiendo y seguidores", "Following and followers"), v.cuentas ? `${v.cuentas.siguiendo} ${E2("SIGUIENDO", "FOLLOWING")} · ${v.cuentas.seguidores} ${E2("SEGUIDORES", "FOLLOWERS")}` : "", () => router.push("/cuenta/vecinos?l=siguiendo")],
    ["ban", E2("Bloqueados y silenciados", "Blocked and muted"), E2("CON DESHACER", "WITH UNDO"), () => router.push("/cuenta/vecinos?l=bloqueados")],
    ["chat", E2("Mensajes", "Messages"), E2("SOLO CON QUIEN TE SIGUE", "ONLY WITH PEOPLE WHO FOLLOW YOU"), () => router.push("/comunidad/mensajes")],
    ["share", E2("Invita vecinos", "Invite neighbors"), E2("CUENTA PARA CAPITÁN · SIN DINERO", "COUNTS TOWARD CAPTAIN · NO MONEY"), () => router.push("/cuenta/invitar")],
  ];
  return (
    <div data-screen-label="APP-COM-VECINO · lo mío" style={{ ...CARD, borderRadius: 18, margin: margen, padding: "4px 16px" }}>
      {filas.map(([ic, t, s, on], i) => (
        <div key={t} role="link" onClick={on} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: i ? LINE : "none", cursor: "pointer" }}>
          <span style={{ display: "grid", flex: "none" }}><Icon name={ic} size={18} color="var(--tl-action)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{t}</div>{s && <div style={{ marginTop: 2, font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{s}</div>}</div>
          <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" />
        </div>))}
    </div>
  );
}

function Editar({ es, v, ui }: { es: boolean; v: V; ui: ComUi }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [bio, setBio] = useState(v.bio ?? ""), [apodo, setApodo] = useState(v.apodo ?? ""), [desde, setDesde] = useState(v.desde ? String(v.desde) : ""), [ocultar, setOcultar] = useState(v.ocultar);
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const guardar = async () => {
    setBusy(true); setErr(null);
    const r = await vecPerfil({ bio, apodo, desde: Number(desde) || null, ocultar }).catch(() => null);
    setBusy(false);
    if (!r) return setErr(E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
    if (!r.ok) return setErr(r.msg ? (es ? r.msg.es : r.msg.en) : E2("Algo falló.", "Something failed."));
    ui.setHoja(null); ui.setAviso({ t: E2("Guardado.", "Saved.") }); router.refresh();
  };
  const campo = { width: "100%", boxSizing: "border-box", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "600 14px Manrope,sans-serif", color: "var(--tl-ink)", background: "var(--tl-white)" } as const;
  const k = (t: string) => <span style={{ font: `700 10px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{t}</span>;
  return (
    <div data-screen-label="APP-COM-VECINO · editar" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>{k(`${E2("PRESENTACIÓN", "INTRO")} · ${bio.length}/${MAX_BIO}`)}
        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))} rows={3} aria-label={E2("Presentación", "Intro")} placeholder={E2("Ej.: Mamá de dos, enfermera de noche.", "E.g.: Mom of two, night nurse.")} style={{ ...campo, padding: "10px 14px", resize: "none", lineHeight: 1.45 }} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>{k(E2("¿CÓMO TE DICEN? · OPCIONAL", "WHAT DO PEOPLE CALL YOU? · OPTIONAL"))}
        <input value={apodo} onChange={(e) => setApodo(e.target.value.slice(0, MAX_APODO))} aria-label={E2("Cómo te dicen", "Nickname")} placeholder={E2("Ej.: Anita", "E.g. Anita")} style={{ ...campo, height: 46, padding: "0 14px" }} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>{k(E2("¿DESDE QUÉ AÑO VIVES AQUÍ? · OPCIONAL", "SINCE WHAT YEAR HAVE YOU LIVED HERE? · OPTIONAL"))}
        <input value={desde} onChange={(e) => setDesde(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" aria-label={E2("Desde qué año", "Since what year")} placeholder="2014" style={{ ...campo, height: 46, padding: "0 14px" }} /></label>
      <button type="button" role="switch" aria-checked={ocultar} onClick={() => setOcultar(!ocultar)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", background: "none", border: 0, textAlign: "left", cursor: "pointer" }}>
        <div style={{ flex: 1 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{E2("Ocultar mis cuentas", "Hide my counts")}</div><div style={{ marginTop: 2, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Los vecinos no ven cuántas publicaciones, seguidores ni seguidos tienes.", "Neighbors don't see how many posts, followers or following you have.")}</div></div>
        <span style={{ width: 40, height: 24, boxSizing: "border-box", borderRadius: 99, padding: 3, background: ocultar ? "var(--tl-ink)" : "rgba(11,14,18,.15)", display: "flex", justifyContent: ocultar ? "flex-end" : "flex-start", flex: "none" }}><span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--tl-white)" }} /></span>
      </button>
      {err && <div role="alert" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(192,57,43,.08)", font: "600 13px/1.4 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</div>}
      <div style={{ display: "flex" }}><Button variant="primary" block disabled={busy} onClick={guardar}>{busy ? E2("Guardando…", "Saving…") : E2("Guardar", "Save")}</Button></div>
    </div>
  );
}
