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
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const NOMBRE: Record<string, [string, string]> = { categorias: ["Categorías", "Categories"], hoy: ["Hoy en el barrio", "Today nearby"], abierto: ["Abierto ahora", "Open now"], semana: ["Esta semana", "This week"], comunidad: ["Comunidad", "Community"], publica: ["Publica tu negocio", "Publish your business"] };
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [bl, setBl] = useState(ciudad.bloques), [avEs, setAvEs] = useState(ciudad.aviso?.es ?? ""), [avEn, setAvEn] = useState(ciudad.aviso?.en ?? "");
  const [anEs, setAnEs] = useState(""), [anEn, setAnEn] = useState(""), [aud, setAud] = useState("todos"), [desde, setDesde] = useState(""), [hasta, setHasta] = useState("");
  const est = useRef({ bl, avEs, avEn, anEs, anEn, aud, desde, hasta }); est.current = { bl, avEs, avEn, anEs, anEn, aud, desde, hasta };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const cambios = JSON.stringify(bl) !== JSON.stringify(ciudad.bloques) || avEs !== (ciudad.aviso?.es ?? "") || avEn !== (ciudad.aviso?.en ?? "");

  const mover = (k: string, dir: -1 | 1) => setBl((b) => { const i = b.findIndex((x) => x.key === k), j = i + dir; if (i < 0 || j < 0 || j >= b.length) return b; const c = [...b]; [c[i], c[j]] = [c[j]!, c[i]!]; return c; });
  const poner = (k: string) => setBl((b) => b.map((x) => (x.key === k ? { ...x, on: !x.on } : x)));

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · HOME POR CIUDAD", "COPY AND PAGES · CITY HOME"), t: conf.titulo, s: `${ciudad.name}, ${ciudad.state}`, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const ESTADO: Record<AnuncioAdm["estado"], string> = { vivo: E("VIVO", "LIVE"), proximo: E("PRÓXIMO", "UPCOMING"), vencido: E("VENCIDO", "EXPIRED"), retirado: E("RETIRADO", "RETIRED") };
  const TONO: Record<AnuncioAdm["estado"], string> = { vivo: "signal", proximo: "action", vencido: "neutral", retirado: "neutral" };
  const cab: Bloque[] = [
    { type: "head", eye: E("CONTROL", "CONTROL"), t: E("Textos y páginas", "Copy and pages"), h1: desk ? 26 : 22, s: E("El Inicio de cada ciudad: su aviso, sus bloques y sus anuncios.", "Each city’s Home: its notice, its blocks and its announcements.") },
    pestanas(l, "home", router), selectorIdioma(l, router),
    { type: "chips", k: E("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: `${c.name}${c.status === "on" ? "" : ` · ${E("pronto", "soon")}`}`, v: c.id === ciudad.id ? "selected" : "filter", onClick: () => router.push(`/admin/textos/home?c=${c.id}`) })) },
    ...(ciudad.status !== "on" ? [{ type: "note" as const, tone: "warn" as const, icon: "info", t: E("Esta ciudad todavía no abre: su Inicio es la pantalla «pronto». Lo que dejes aquí se verá cuando abra.", "This city is not open yet: its Home is the “soon” screen. What you leave here shows when it opens.") }] : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-home-ciudad={ciudad.id}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      <PanelBloques bloques={[
        { type: "group", k: E(`AVISO DEL INICIO · ${ciudad.name.toUpperCase()}`, `HOME NOTICE · ${ciudad.name.toUpperCase()}`) },
        { type: "field", k: E("ESPAÑOL (VACÍO = SIN AVISO)", "SPANISH (EMPTY = NO NOTICE)"), val: avEs, onChange: setAvEs, max: 160, count: `${avEs.length}/160`, lock: !editar },
        { type: "field", k: E("INGLÉS", "ENGLISH"), val: avEn, onChange: setAvEn, max: 160, count: `${avEn.length}/160`, lock: !editar },
      ]} />
      <PanelBloques bloques={[{ type: "rows", k: E("BLOQUES DEL INICIO", "HOME BLOCKS"), items: bl.map((b, i) => ({ key: b.key, icon: b.on ? "check" : "ban", t: E(...NOMBRE[b.key]!), tgOn: b.on, onTg: editar ? () => poner(b.key) : undefined,
        s: MOVIBLES.has(b.key) ? E(`Lugar ${i + 1}`, `Position ${i + 1}`) : b.key === "categorias" ? E("Arriba de todo (el menú de categorías)", "At the top (the category menu)") : E("Al final (la tarjeta de Publica tu negocio)", "At the end (the Publish your business card)"),
        acts: editar && MOVIBLES.has(b.key) ? [{ l: E("Subir", "Up"), v: "secondary", onClick: () => mover(b.key, -1) }, { l: E("Bajar", "Down"), v: "secondary", onClick: () => mover(b.key, 1) }] : undefined, chev: false })) }]} />
      {editar ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Guardar el Inicio de la ciudad", "Save the city Home"), v: "action", off: !cambios, onClick: () => setConf({ titulo: E("Guardar el Inicio de la ciudad", "Save the city Home"), cta: E("Guardar", "Save"),
        sub: E("Lo ve el vecino al momento. Queda en el historial con tu motivo.", "Neighbors see it right away. It goes in the history with your reason."), plantillas: [E("Menos ruido en el Inicio.", "Less noise on the Home."), E("Aviso de la ciudad.", "City notice.")],
        hacer: (m) => homeGuardar(ciudad.id, est.current.avEs, est.current.avEn, est.current.bl, m) }) }] }]} /> : null}
      <A.AdminList label={`${d.anuncios.length} ${E("ANUNCIOS", "ANNOUNCEMENTS")} · ${d.vivos} ${E("VIVOS", "LIVE")}`} rows={d.anuncios.map((a) => ({ icon: a.estado === "vivo" ? "bell" : "calendar", title: a[l], tag: ESTADO[a.estado], tone: TONO[a.estado],
        sub: `${cuando(a.from_at)} → ${cuando(a.to_at)} · ${a.audience === "todos" ? E("todos", "everyone") : E("vecinos con cuenta", "neighbors with an account")}${a.quien ? ` · ${a.quien}` : ""}${a.retired_reason ? ` · ${E("retirado", "retired")}: ${a.retired_reason}` : ""}`,
        actions: editar && (a.estado === "vivo" || a.estado === "proximo") ? [{ label: E("Retirar", "Retire"), variant: "secondary", onClick: () => setConf({ titulo: E("Retirar el anuncio", "Retire the announcement"), cta: E("Retirar", "Retire"), peligro: true,
          sub: E("Deja de salir en el Inicio. Nada se borra: queda en el historial.", "It stops showing on the Home. Nothing is deleted: it stays in the history."), plantillas: [E("Ya no aplica.", "No longer applies."), E("Tenía un error.", "It had an error.")], hacer: (m) => anuncioRetirar(a.id, m) }) }] : [] }))} />
      {editar ? <PanelBloques bloques={[
        { type: "group", k: E(`NUEVO ANUNCIO · ${ciudad.name.toUpperCase()}`, `NEW ANNOUNCEMENT · ${ciudad.name.toUpperCase()}`) },
        { type: "field", k: E("TEXTO EN ESPAÑOL", "SPANISH TEXT"), val: anEs, onChange: setAnEs, max: 160, count: `${anEs.length}/160` },
        { type: "field", k: E("TEXTO EN INGLÉS", "ENGLISH TEXT"), val: anEn, onChange: setAnEn, max: 160, count: `${anEn.length}/160` },
        { type: "chips", k: E("¿A QUIÉN?", "WHO SEES IT?"), items: [{ l: E("Todos", "Everyone"), v: aud === "todos" ? "selected" : "filter", onClick: () => setAud("todos") }, { l: E("Vecinos con cuenta", "Neighbors with an account"), v: aud === "vecinos" ? "selected" : "filter", onClick: () => setAud("vecinos") }] },
        { type: "field", k: E("DESDE (AAAA-MM-DD HH:MM, HORA DE LA CIUDAD)", "FROM (YYYY-MM-DD HH:MM, CITY TIME)"), val: desde, onChange: setDesde, ph: "2026-11-20 08:00", max: 16 },
        { type: "field", k: E("HASTA (31 DÍAS COMO MÁXIMO)", "UNTIL (31 DAYS AT MOST)"), val: hasta, onChange: setHasta, ph: "2026-11-21 08:00", max: 16 },
        { type: "acts", items: [{ l: E("Crear el anuncio", "Create the announcement"), v: "action", off: !(anEs.trim() && anEn.trim() && desde.trim() && hasta.trim()), onClick: () => setConf({ titulo: E("Crear el anuncio", "Create the announcement"), cta: E("Crear", "Create"),
          sub: E("Sale en el Inicio de la ciudad dentro de sus fechas. No se edita: se retira y se crea otro.", "It shows on the city Home within its dates. It is not edited: retire it and create another."), plantillas: [E("Evento del barrio.", "Neighborhood event."), E("Aviso del equipo.", "Team notice.")],
          hacer: (m) => anuncioCrear(ciudad.id, est.current.aud, est.current.anEs, est.current.anEn, est.current.desde, est.current.hasta, m) }) }] },
      ]} /> : null}
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E("Un bloque apagado ni se consulta. Sin cambios, el Inicio sale como siempre. Los anuncios salen arriba del Inicio mientras están dentro de sus fechas; vencen solos y nada se borra.", "A block that is off is not even queried. Without changes, the Home looks as always. Announcements show at the top of the Home while within their dates; they expire on their own and nothing is deleted.") }]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
