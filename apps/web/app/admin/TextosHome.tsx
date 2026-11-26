"use client";
/* 9f · Super Admin › Textos y páginas › Home por ciudad (fase9-apertura.md §4 9f): por ciudad, el aviso fijo del Inicio (ES/EN), los bloques encendidos y su
   orden (categorías, Hoy en el barrio, Abierto ahora, Esta semana, Comunidad, Publica tu negocio) y los Anuncios (el banner con fechas; no se edita: se retira
   y se crea otro; nada se borra). Todo con motivo (ConfirmarMotivo, patrón 2ao). Sin cambios, el Inicio sale como siempre. Compuesto con piezas
   existentes (REVISION 9f). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { AnuncioAdm, CiudadHome, DatosHome } from "@/lib/cms-admin";
import { anuncioCrear, anuncioRetirar, homeGuardar } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, pestanas, selectorIdioma, type L } from "./TextosComun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const MOVIBLES = new Set(["hoy", "abierto", "semana", "comunidad"]);

export function TextosHome({ d, ciudad, l, editar }: { d: DatosHome; ciudad: CiudadHome; l: L; editar: boolean }) {
  const { E2 } = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const NOMBRE: Record<string, [string, string]> = { categorias: ["Categorías", "Categories"], hoy: ["Hoy en el barrio", "Today nearby"], abierto: ["Abierto ahora", "Open now"], semana: ["Esta semana", "This week"], comunidad: ["Comunidad", "Community"], publica: ["Publica tu negocio", "Publish your business"] };
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [bl, setBl] = useState(ciudad.bloques), [avEs, setAvEs] = useState(ciudad.aviso?.es ?? ""), [avEn, setAvEn] = useState(ciudad.aviso?.en ?? "");
  const [anEs, setAnEs] = useState(""), [anEn, setAnEn] = useState(""), [aud, setAud] = useState("todos"), [desde, setDesde] = useState(""), [hasta, setHasta] = useState("");
  const est = useRef({ bl, avEs, avEn, anEs, anEn, aud, desde, hasta }); est.current = { bl, avEs, avEn, anEs, anEn, aud, desde, hasta };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo.", "Done.")); setConf(null); router.refresh(); };
  const cambios = JSON.stringify(bl) !== JSON.stringify(ciudad.bloques) || avEs !== (ciudad.aviso?.es ?? "") || avEn !== (ciudad.aviso?.en ?? "");

  const mover = (k: string, dir: -1 | 1) => setBl((b) => { const i = b.findIndex((x) => x.key === k), j = i + dir; if (i < 0 || j < 0 || j >= b.length) return b; const c = [...b]; [c[i], c[j]] = [c[j]!, c[i]!]; return c; });
  const poner = (k: string) => setBl((b) => b.map((x) => (x.key === k ? { ...x, on: !x.on } : x)));

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("TEXTOS Y PÁGINAS · HOME POR CIUDAD", "COPY AND PAGES · CITY HOME"), t: E2("Textos y páginas", "Copy and pages"), s: `${ciudad.name}, ${ciudad.state}`, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const ESTADO: Record<AnuncioAdm["estado"], string> = { vivo: E2("VIVO", "LIVE"), proximo: E2("PRÓXIMO", "UPCOMING"), vencido: E2("VENCIDO", "EXPIRED"), retirado: E2("RETIRADO", "RETIRED") };
  const TONO: Record<AnuncioAdm["estado"], string> = { vivo: "signal", proximo: "action", vencido: "neutral", retirado: "neutral" };
  const cab: Bloque[] = [
    { type: "head", eye: E2("CONTROL", "CONTROL"), t: E2("Textos y páginas", "Copy and pages"), h1: desk ? 26 : 22, s: E2("El Inicio de cada ciudad: su aviso, sus bloques y sus anuncios.", "Each city’s Home: its notice, its blocks and its announcements.") },
    pestanas(l, "home", router), selectorIdioma(l, router),
    { type: "chips", k: E2("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: `${c.name}${c.status === "on" ? "" : ` · ${E2("pronto", "soon")}`}`, v: c.id === ciudad.id ? "selected" : "filter", onClick: () => router.push(`/admin/textos/home?c=${c.id}`) })) },
    ...(ciudad.status !== "on" ? [{ type: "note" as const, tone: "warn" as const, icon: "info", t: E2("Esta ciudad todavía no abre: su Inicio es la pantalla «pronto». Lo que dejes aquí se verá cuando abra.", "This city is not open yet: its Home is the “soon” screen. What you leave here shows when it opens.") }] : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-home-ciudad={ciudad.id}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      <PanelBloques bloques={[
        { type: "group", k: E2(`AVISO DEL INICIO · ${ciudad.name.toUpperCase()}`, `HOME NOTICE · ${ciudad.name.toUpperCase()}`) },
        { type: "field", k: E2("ESPAÑOL (VACÍO = SIN AVISO)", "SPANISH (EMPTY = NO NOTICE)"), val: avEs, onChange: setAvEs, max: 160, count: `${avEs.length}/160`, lock: !editar },
        { type: "field", k: E2("INGLÉS", "ENGLISH"), val: avEn, onChange: setAvEn, max: 160, count: `${avEn.length}/160`, lock: !editar },
      ]} />
      <PanelBloques bloques={[{ type: "rows", k: E2("BLOQUES DEL INICIO", "HOME BLOCKS"), items: bl.map((b, i) => ({ key: b.key, icon: b.on ? "check" : "ban", t: E2(...NOMBRE[b.key]!), tgOn: b.on, onTg: editar ? () => poner(b.key) : undefined,
        s: MOVIBLES.has(b.key) ? E2(`Lugar ${i + 1}`, `Position ${i + 1}`) : b.key === "categorias" ? E2("Arriba de todo (el menú de categorías)", "At the top (the category menu)") : E2("Al final (la tarjeta de Publica tu negocio)", "At the end (the Publish your business card)"),
        acts: editar && MOVIBLES.has(b.key) ? [{ l: E2("Subir", "Up"), v: "secondary", onClick: () => mover(b.key, -1) }, { l: E2("Bajar", "Down"), v: "secondary", onClick: () => mover(b.key, 1) }] : undefined, chev: false })) }]} />
      {editar ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Guardar el Inicio de la ciudad", "Save the city Home"), v: "action", off: !cambios, onClick: () => setConf({ titulo: E2("Guardar el Inicio de la ciudad", "Save the city Home"), cta: E2("Guardar", "Save"),
        sub: E2("Lo ve el vecino al momento. Queda en el historial con tu motivo.", "Neighbors see it right away. It goes in the history with your reason."), plantillas: [E2("Menos ruido en el Inicio.", "Less noise on the Home."), E2("Aviso de la ciudad.", "City notice.")],
        nota: "interna", hacer: (m) => homeGuardar(ciudad.id, est.current.avEs, est.current.avEn, est.current.bl, m) }) }] }]} /> : null}
      <A.AdminList label={`${d.anuncios.length} ${E2("ANUNCIOS", "ANNOUNCEMENTS")} · ${d.vivos} ${E2("VIVOS", "LIVE")}`} rows={d.anuncios.map((a) => ({ icon: a.estado === "vivo" ? "bell" : "calendar", title: a[l], tag: ESTADO[a.estado], tone: TONO[a.estado],
        sub: `${cuando(a.from_at)} → ${cuando(a.to_at)} · ${a.audience === "todos" ? E2("todos", "everyone") : a.audience === "negocios" ? E2("negocios (Hoy del panel)", "businesses (dashboard Today)") : E2("vecinos con cuenta", "neighbors with an account")}${a.quien ? ` · ${a.quien}` : ""}${a.retired_reason ? ` · ${E2("retirado", "retired")}: ${a.retired_reason}` : ""}`,
        actions: editar && (a.estado === "vivo" || a.estado === "proximo") ? [{ label: E2("Retirar", "Retire"), variant: "secondary", onClick: () => setConf({ titulo: E2("Retirar el anuncio", "Retire the announcement"), cta: E2("Retirar", "Retire"), peligro: true,
          sub: E2("Deja de salir en el Inicio. Nada se borra: queda en el historial.", "It stops showing on the Home. Nothing is deleted: it stays in the history."), plantillas: [E2("Ya no aplica.", "No longer applies."), E2("Tenía un error.", "It had an error.")], nota: "interna", hacer: (m) => anuncioRetirar(a.id, m) }) }] : [] }))} />
      {editar ? <PanelBloques bloques={[
        { type: "group", k: E2(`NUEVO ANUNCIO · ${ciudad.name.toUpperCase()}`, `NEW ANNOUNCEMENT · ${ciudad.name.toUpperCase()}`) },
        { type: "field", k: E2("TEXTO EN ESPAÑOL", "SPANISH TEXT"), val: anEs, onChange: setAnEs, max: 160, count: `${anEs.length}/160` },
        { type: "field", k: E2("TEXTO EN INGLÉS", "ENGLISH TEXT"), val: anEn, onChange: setAnEn, max: 160, count: `${anEn.length}/160` },
        { type: "chips", k: E2("¿A QUIÉN?", "WHO SEES IT?"), items: [{ l: E2("Todos", "Everyone"), v: aud === "todos" ? "selected" : "filter", onClick: () => setAud("todos") }, { l: E2("Vecinos con cuenta", "Neighbors with an account"), v: aud === "vecinos" ? "selected" : "filter", onClick: () => setAud("vecinos") },
          // 9n-7 · Negocios: sale en Hoy del panel de los negocios de la ciudad, no en el Inicio (LAUNCH «Anuncios para negocios en el panel»).
          { l: E2("Negocios", "Businesses"), v: aud === "negocios" ? "selected" : "filter", onClick: () => setAud("negocios") }] },
        { type: "field", k: E2("DESDE (AAAA-MM-DD HH:MM, HORA DE LA CIUDAD)", "FROM (YYYY-MM-DD HH:MM, CITY TIME)"), val: desde, onChange: setDesde, ph: "2026-11-20 08:00", max: 16 },
        { type: "field", k: E2("HASTA (31 DÍAS COMO MÁXIMO)", "UNTIL (31 DAYS AT MOST)"), val: hasta, onChange: setHasta, ph: "2026-11-21 08:00", max: 16 },
        { type: "acts", items: [{ l: E2("Crear el anuncio", "Create the announcement"), v: "action", off: !(anEs.trim() && anEn.trim() && desde.trim() && hasta.trim()), onClick: () => setConf({ titulo: E2("Crear el anuncio", "Create the announcement"), cta: E2("Crear", "Create"),
          sub: E2("Sale en el Inicio de la ciudad dentro de sus fechas. No se edita: se retira y se crea otro.", "It shows on the city Home within its dates. It is not edited: retire it and create another."), plantillas: [E2("Evento del barrio.", "Neighborhood event."), E2("Aviso del equipo.", "Team notice.")],
          nota: "interna", hacer: (m) => anuncioCrear(ciudad.id, est.current.aud, est.current.anEs, est.current.anEn, est.current.desde, est.current.hasta, m) }) }] },
      ]} /> : null}
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E2("Un bloque apagado ni se consulta. Sin cambios, el Inicio sale como siempre. Los anuncios salen arriba del Inicio mientras están dentro de sus fechas; vencen solos y nada se borra.", "A block that is off is not even queried. Without changes, the Home looks as always. Announcements show at the top of the Home while within their dates; they expire on their own and nothing is deleted.") }]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
