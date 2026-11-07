"use client";
/* APP-COM-HOY · Hoy en el barrio (prototipo hoyV + Hoy en el barrio (variantes) 8a): lo que traen hoy los negocios de la ciudad, en
   StoryCard (una tarjeta por negocio con hasta 3 avisos de menos de 24 h; tipo OFERTA · NOVEDAD · LLEGÓ · AVISO; «QUEDAN N H»; toque
   izquierda/derecha; al final abre su página). Chips por categoría; «Ver más» con cursor; la tarjeta para negocios («Publica tus
   Novedades y salen aquí 24 horas»). Sin avisos: «Nuevos en el barrio». Dos marcos: dentro de la Comunidad (con cuenta) y público. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { HOY_CATS, type PaginaHoy } from "@/lib/hoy-comun";
import { LINEA_FIJA } from "@/lib/comunidad-filtro";
import type { Tarjeta } from "@/lib/tarjeta";
import { T as TX } from "@/lib/textos";
import { TarjetaHoy } from "../../HoyCarrusel";
import { TarjetaNegocio } from "../../TarjetaNegocio";
import { MONO, Marco, PestanasModulo, useAncho, useComUi, type YoCom } from "../Marco";
import { hoyMas } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "SectionHeader";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, SectionHeader } = UI as unknown as Record<N, ComponentType<any>>;

function Cuerpo({ es, ciudad, cat, d, nuevos, ancho }: { es: boolean; ciudad: string; cat: string; d: PaginaHoy; nuevos: Tarjeta[]; ancho: number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), D = ancho >= 1024;
  const [h, setH] = useState(d.historias), [mas, setMas] = useState(d.mas), [cargando, setCargando] = useState(false);
  const [antes, setAntes] = useState(d);
  if (antes !== d) { setAntes(d); setH(d.historias); setMas(d.mas); }
  const verMas = async () => { if (!mas || cargando) return; setCargando(true); try { const r = await hoyMas(cat, mas); setH((x) => [...x, ...r.historias.filter((y) => !x.some((z) => z.id === y.id))]); setMas(r.mas); } catch { /* sin red: el botón sigue */ } finally { setCargando(false); } };
  // Teléfono: dos por fila (prototipo 170 × 232); escritorio: 230 × 300.
  const w = D ? 230 : Math.max(150, Math.floor((Math.min(ancho, 720) - 32 - 10) / 2)), alto = D ? 300 : Math.round(w * 1.36);
  return (
    <div data-screen-label="APP-COM-HOY · Hoy en el barrio" style={{ display: "flex", flexDirection: "column", gap: 14, padding: D ? 0 : "14px 16px 0", maxWidth: D ? 760 : undefined }}>
      {!D && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--tl-open)" }} /><span style={{ font: "800 20px/1.15 Sora,sans-serif", letterSpacing: "-.03em" }}>{E2("Hoy en el barrio", "Today nearby")}</span></div>
          <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>{E2(`Lo que traen hoy los negocios de ${ciudad}. Cada aviso se borra a las 24 horas.`, `What ${ciudad} businesses have today. Each notice disappears after 24 hours.`)}</div>
        </div>
      )}
      <div className="hs" style={{ display: "flex", gap: 6, flexWrap: D ? "wrap" : "nowrap", overflowX: D ? "visible" : "auto" }}>
        {HOY_CATS.map((c) => <Chip key={c.k} variant={cat === c.k ? "selected" : "filter"} onClick={() => router.push(c.k === "todo" ? "/comunidad/hoy" : `/comunidad/hoy?c=${c.k}`)}>{es ? c.l.es : c.l.en}</Chip>)}
      </div>
      {h.length ? (
        <div data-screen-label="Hoy en el barrio · historias" style={{ display: "flex", flexWrap: "wrap", gap: D ? 14 : 10 }}>
          {h.map((x) => <TarjetaHoy key={x.id} h={x} es={es} w={w} alto={alto} flechas={D} />)}
        </div>
      ) : (
        <div data-screen-label="Hoy en el barrio · vacío" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "18px 16px" }}>
            <div style={{ font: "800 17px/1.25 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{cat === "todo" ? E2("Hoy todavía no hay avisos", "No notices yet today") : E2("Hoy no hay avisos de esta categoría", "No notices in this category today")}</div>
            <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{E2("Cuando un negocio publique una oferta o una novedad, sale aquí 24 horas.", "When a business posts a deal or an update, it shows here for 24 hours.")}</div>
          </div>
          {nuevos.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader title={E2("Nuevos en el barrio", "New in the neighborhood")} />
              <div style={{ display: "grid", gridTemplateColumns: D ? "repeat(auto-fill,minmax(300px,1fr))" : "minmax(0,1fr)", gap: 12 }}>
                {nuevos.map((b) => <div key={b.id} style={{ display: "grid" }}><TarjetaNegocio b={b} origen="hoy" textos={{ hoy: TX[es ? "es" : "en"].todayTag, llamar: TX[es ? "es" : "en"].call }} /></div>)}
              </div>
            </section>
          )}
        </div>
      )}
      {mas && <div style={{ display: "flex", justifyContent: "center" }}><Button variant="secondary" size="md" disabled={cargando} onClick={verMas}>{cargando ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div>}
      <div role="link" onClick={() => router.push("/publica")} data-screen-label="Hoy en el barrio · para negocios" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", maxWidth: 720 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,168,143,.14)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="store" size={18} color="var(--tl-open-text)" /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.35 Manrope,sans-serif" }}>{E2("¿Tienes negocio? Publica tus Novedades y salen aquí 24 horas.", "Have a business? Post your Updates and they show here for 24 hours.")}</div>
          <div style={{ marginTop: 3, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Con el plan Pro: ofertas, «Hoy hay», avisos y encuestas.", "With the Pro plan: deals, “Today”, notices and polls.")}</div></div>
        <Icon name="chevronRight" size={16} color="rgba(11,14,18,.4)" />
      </div>
    </div>
  );
}

/* Dentro de la Comunidad (con cuenta y bienvenida hecha): el marco del módulo, la pestaña activa y el riel con tu rango y las reglas. */
export function HoyVecino({ es, yo, ciudad, cat, d, nuevos }: { es: boolean; yo: YoCom; ciudad: string; cat: string; d: PaginaHoy; nuevos: Tarjeta[] }) {
  const ui = useComUi(), w = useAncho();
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-HOY" titulo={es ? "Hoy en el barrio" : "Today nearby"} sub={es ? "LO QUE TRAEN HOY LOS NEGOCIOS · SE BORRA A LAS 24 H" : "WHAT BUSINESSES HAVE TODAY · GONE IN 24 H"}>
      <Cuerpo es={es} ciudad={ciudad} cat={cat} d={d} nuevos={nuevos} ancho={w} />
      <div style={{ height: w >= 1024 ? 0 : 110 }} />
    </Marco>
  );
}

/* Sin cuenta (o sin la bienvenida): lo mismo, con el encabezado del módulo y la invitación a la conversación (nada de vecinos). */
export function HoyPublico({ es, ciudad, estado, cat, d, nuevos, conSesion }: { es: boolean; ciudad: string; estado: string; cat: string; d: PaginaHoy; nuevos: Tarjeta[]; conSesion: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), w = useAncho(), D = w >= 1024;
  const entrar = () => router.push(conSesion ? "/comunidad" : `/entrar?volver=${encodeURIComponent("/comunidad")}`);
  const invita = (
    <div data-screen-label="Hoy en el barrio · la conversación" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="lock" size={14} color="rgba(11,14,18,.5)" /><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.55)" }}>{E2("LA CONVERSACIÓN · SOLO VECINOS", "THE CONVERSATION · NEIGHBORS ONLY")}</span></div>
      <div style={{ font: "800 16px/1.3 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{E2("Pregunta y recomienda con la gente de tu barrio", "Ask and recommend with people from your neighborhood")}</div>
      <div style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{E2("La comunidad es para vecinos con cuenta. Entra para leer las respuestas y recomendar.", "Community is for neighbors with an account. Sign in to read answers and recommend.")}</div>
      <div style={{ font: "700 12.5px/1.45 Manrope,sans-serif", textWrap: "pretty" }}>{es ? LINEA_FIJA.es : LINEA_FIJA.en}</div>
      <div style={{ display: "flex" }}><Button variant="primary" size="md" icon={conSesion ? "users" : "phone"} onClick={entrar}>{conSesion ? E2("Ir a la comunidad", "Go to community") : E2("Entrar", "Sign in")}</Button></div>
    </div>
  );
  return (
    <div data-screen-label={`APP-COM-HOY · ${D ? "desktop" : "móvil"} · público`} style={{ minHeight: "calc(100dvh - 57px)", background: D ? "var(--tl-paper)" : "var(--tl-white)", paddingBottom: D ? 40 : 110 }}>
      {!D && (
        <div data-screen-label="Comunidad · encabezado del módulo" style={{ background: "var(--tl-white)" }}>
          <div style={{ padding: "16px 20px 12px" }}><h1 style={{ margin: 0, font: "800 26px/1.05 Sora,sans-serif", letterSpacing: "-.04em" }}>{E2("Comunidad", "Community")}</h1><div style={{ marginTop: 6, font: `600 10px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{`${ciudad.toUpperCase()}, ${estado}`}</div></div>
          <PestanasModulo es={es} code="APP-COM-HOY" />
        </div>
      )}
      <div style={{ maxWidth: D ? 1260 : undefined, margin: "0 auto", padding: D ? "26px 40px 0" : 0, boxSizing: "border-box", display: "grid", gridTemplateColumns: D ? "minmax(0,1fr) 340px" : "minmax(0,1fr)", gap: D ? 30 : 14, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {D && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--tl-open)" }} /><h1 style={{ margin: 0, font: "800 30px/1.1 Sora,sans-serif", letterSpacing: "-.04em" }}>{E2("Hoy en el barrio", "Today nearby")}</h1></div>
              <div style={{ marginTop: 8, font: `600 10.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{E2(`LO QUE TRAEN HOY LOS NEGOCIOS DE ${ciudad.toUpperCase()} · SE BORRA A LAS 24 H`, `WHAT ${ciudad.toUpperCase()} BUSINESSES HAVE TODAY · GONE IN 24 H`)}</div>
            </div>
          )}
          <Cuerpo es={es} ciudad={ciudad} cat={cat} d={d} nuevos={nuevos} ancho={w} />
        </div>
        <div style={{ padding: D ? 0 : "0 16px", position: D ? "sticky" : undefined, top: D ? 90 : undefined }}>{invita}</div>
      </div>
    </div>
  );
}
