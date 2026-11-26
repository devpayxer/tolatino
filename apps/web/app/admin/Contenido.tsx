"use client";
/* ADM-CONT · Contenido (Super Admin.dc.html secCont / contRow): lo que escriben vecinos y negocios y ya existe en la app
   (reseñas, novedades, comentarios de novedades y vacantes). Cifras, pestañas, búsqueda, filtros (con reporte, ocultos,
   votos negativos), y ocultar o mostrar con motivo (el autor lo ve; queda en la auditoría). Publicaciones de la Comunidad
   (5a): además fijar arriba de su ciudad y bloquear comentarios; comentarios de vecinos (5b): ocultar y restaurar con motivo. Auto-moderación
   (5d). «Hoy en el barrio» (lo que sale ahora y su origen; «Retirar de Hoy» con motivo y aviso al negocio) y «Cuenta oficial» (escribir,
   programar y fijar) (5e, HoyAdmin.tsx). 5i: las 7 pestañas del prototipo (Todo · Publicaciones · Comentarios · Hoy en el barrio ·
   Reseñas · Auto-moderación · Cuenta oficial), filtros (ciudad, tipo, estado, reporte, votos, autor, rango, invitados), cursor, el hilo
   con el comentario marcado, «Ocultar los N reportados» con progreso y fallos parciales (la cuenta oficial nunca en lote) y mover de
   ciudad. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FilaCont, FiltrosCont, ListaCont } from "@/lib/admin-contenido";
import { comentarioOcultar, novedadOcultar, resenaOcultar, vacanteOcultar } from "./acciones-negocios";
import { cmComOcultar, pubComentarios, pubFijar, pubOcultar } from "./acciones-comunidad";
import { loteOcultarUno, loteReportados, pubMoverCiudad } from "./acciones-contenido";
import type { ResAdm } from "./acciones-colas";
import * as UI from "@tolatino/ui";
import type { ComponentType } from "react";
import { ConfirmarMotivo, PLANT, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { AutoModeracion } from "./AutoModeracion";
import type { AutoMod } from "@/lib/admin-confianza";
import { HoyAdmin, OficialAdmin } from "./HoyAdmin";
import type { HoyAdmin as DatosHoy } from "@/lib/admin-contenido";
import type { CuentaOficial } from "@/lib/oficial";
import { AnfitrionesAdmin } from "./AnfitrionesAdmin";
import type { AnfAdm } from "@/lib/anfitriones";
import type { FuentesAdm } from "@/lib/anfitriones-fuentes";
import { useAhora } from "@/lib/ahora";
import { useE2 } from "./idioma-admin";
import { marcaAnfitrion } from "@/lib/comunidad-comun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon" | "BatchProgress", ComponentType<any>>;

type EF = (es: string, en: string) => string;
const TIPO_ES: Record<FilaCont["k"], [string, string]> = { rev: ["Reseña", "star"], nov: ["Novedad", "news"], cm: ["Comentario", "chat"], vac: ["Vacante", "brief"], pub: ["Publicación", "users"], ccm: ["Comentario de vecino", "bubble"] };
const TIPO_EN: Record<FilaCont["k"], string> = { rev: "Review", nov: "Update", cm: "Comment", vac: "Job", pub: "Post", ccm: "Neighbor comment" };
const PUB = (E2: EF): Record<string, string> => ({ pregunta: E2("Pregunta", "Question"), recomendacion: E2("Recomendación", "Recommendation"), encuesta: E2("Encuesta", "Poll"), publicacion: E2("Publicación", "Post") });
const hace = (iso: string, ahora: number, E2: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E2("HACE UN MOMENTO", "JUST NOW") : h < 24 ? E2(`HACE ${Math.floor(h)} H`, `${Math.floor(h)} H AGO`) : E2(`HACE ${Math.floor(h / 24)} D`, `${Math.floor(h / 24)} D AGO`); };

type Lote = { total: number; hechos: number; fallos: { texto: string; motivo: string }[]; fin: boolean } | null;
const TIPOS_L = (E2: EF): [FilaCont["k"], string][] => [["pub", E2("Publicaciones", "Posts")], ["ccm", E2("Comentarios de vecinos", "Neighbor comments")], ["rev", E2("Reseñas", "Reviews")], ["nov", E2("Novedades", "Updates")], ["cm", E2("Comentarios de novedades", "Update comments")], ["vac", E2("Vacantes", "Jobs")]];

export function Contenido({ d, f, porPagina, puede, puedeCom, editaCom, auto = null, hoy = null, oficial = null, escribeOficial = false, anf = null, tab }: {
  d: ListaCont; f: FiltrosCont; porPagina: number; puede: boolean; puedeCom: boolean; editaCom: boolean; auto?: AutoMod | null; hoy?: DatosHoy | null; oficial?: CuentaOficial | null; escribeOficial?: boolean; anf?: (AnfAdm & { noticias: FuentesAdm }) | null; tab: string;
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, { E2 } = useE2();
  const EN = E2("", "x") === "x", TIPO = Object.fromEntries(Object.entries(TIPO_ES).map(([k, v]) => [k, [EN ? TIPO_EN[k as FilaCont["k"]] : v[0], v[1]]])) as Record<FilaCont["k"], [string, string]>, PB = PUB(E2);
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [lote, setLote] = useState<Lote>(null);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("c" in p)) u.delete("c"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const accion = (x: FilaCont, ocultar: boolean): Promise<ResAdm> => {
    const m = (motivo: string) => x.k === "ccm" ? cmComOcultar(x.id, ocultar, motivo) : x.k === "pub" ? pubOcultar(x.id, ocultar, motivo) : x.k === "rev" ? resenaOcultar(x.biz, x.id, ocultar, motivo) : x.k === "nov" ? novedadOcultar(x.biz, x.id, ocultar, motivo) : x.k === "cm" ? comentarioOcultar(x.biz, x.id, ocultar, motivo) : vacanteOcultar(x.biz, x.id, ocultar, motivo);
    return new Promise((ok) => setConf({
      titulo: ocultar ? (x.k === "pub" ? E2(`Ocultar la publicación de ${x.who}`, `Hide ${x.who}’s post`) : x.k === "ccm" ? E2(`Ocultar el comentario de ${x.who}`, `Hide ${x.who}’s comment`) : E2(`Ocultar ${TIPO[x.k][0].toLowerCase()} de ${x.bname}`, `Hide ${TIPO[x.k][0].toLowerCase()} from ${x.bname}`)) : E2(`¿Por qué vuelve esta ${TIPO[x.k][0].toLowerCase()}?`, `Why is this ${TIPO[x.k][0].toLowerCase()} coming back?`),
      sub: ocultar ? (x.k === "pub" ? E2("Sale del muro y de la publicación para todos. El autor ve el motivo y puede apelar; queda en la auditoría.", "It leaves the wall and the post for everyone. The author sees the reason and can appeal; it stays in the audit log.") : x.k === "ccm" ? E2("Sale del hilo para todos. El autor recibe el aviso con el motivo y puede apelar; queda en la auditoría.", "It leaves the thread for everyone. The author gets the notice with the reason and can appeal; it stays in the audit log.") : x.k === "vac" ? E2("Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel.", "It leaves their page and no one new applies. The owner sees the reason in their dashboard.") : x.k === "rev" ? E2("Sale de su página y de las estrellas. El autor ve el motivo.", "It leaves their page and the stars. The author sees the reason.") : E2("Sale de su página. Queda en la auditoría.", "It leaves their page. It stays in the audit log.")) : x.k === "pub" ? E2("Vuelve al muro y el autor recibe el aviso.", "It goes back to the wall and the author gets the notice.") : x.k === "ccm" ? E2("Vuelve al hilo y el autor recibe el aviso.", "It goes back to the thread and the author gets the notice.") : undefined,
      peligro: ocultar, plantillas: ocultar ? (x.k === "vac" ? [E2("Pide papeles, SSN o pago para aplicar", "Asks for papers, SSN or payment to apply"), E2("Pago por debajo del mínimo", "Pay below minimum"), E2("Vacante falsa o engañosa", "Fake or misleading job"), E2("Discriminatoria", "Discriminatory")] : PLANT.hide) : PLANT.keep,
      nota: ocultar ? "persona" : "interna", hacer: async (motivo) => { const r = await m(motivo); ok(r); return r; },
    }));
  };
  const pubAccion = (x: FilaCont, que: "fijar" | "comentarios"): Promise<ResAdm> => new Promise((ok) => setConf({
    titulo: que === "fijar" ? (x.pin ? E2("¿Por qué se desfija?", "Why unpin it?") : E2(`Fijar la publicación de ${x.who}`, `Pin ${x.who}’s post`)) : x.lock ? E2("¿Por qué se abren los comentarios?", "Why reopen comments?") : E2(`Bloquear los comentarios de ${x.who}`, `Lock comments on ${x.who}’s post`),
    sub: que === "fijar" ? (x.pin ? E2("Deja de salir arriba del muro.", "It stops showing at the top of the wall.") : E2("Sale arriba del muro de su ciudad 7 días, como fijada. Solo una a la vez; no cambia los votos de nadie.", "It shows at the top of its city’s wall for 7 days, pinned. Only one at a time; nobody’s votes change.")) : x.lock ? undefined : E2("Nadie más comenta; lo que ya está se queda.", "No one else comments; what’s there stays."),
    peligro: false, plantillas: que === "fijar" ? [E2("Aviso importante de la ciudad", "Important city notice"), E2("Pregunta de la semana", "Question of the week"), E2("Ya pasó", "It’s over")] : [E2("Discusión fuera de control", "Discussion out of control"), E2("Tema resuelto", "Topic resolved"), E2("Revisado", "Reviewed")],
    nota: "interna", hacer: async (motivo) => { const r = await (que === "fijar" ? pubFijar(x.id, !x.pin, motivo) : pubComentarios(x.id, !x.lock, motivo)); ok(r); return r; },
  }));
  const mover = (x: FilaCont) => setConf({
    titulo: E2(`Mover la publicación de ${x.who}`, `Move ${x.who}’s post`), sub: E2(`Está en ${x.ciudad}. Sale en el muro de la otra ciudad con sus comentarios; la ubicación la vuelve a poner el sistema (nunca la de la persona). Queda en la auditoría.`, `It’s in ${x.ciudad}. It shows on the other city’s wall with its comments; the system sets the location again (never the person’s). It stays in the audit log.`),
    elegir: { label: E2("A QUÉ CIUDAD", "TO WHICH CITY"), items: d.destinos.filter((c) => c.name !== x.ciudad).map((c) => ({ k: c.id, l: c.name })) }, cta: E2("Mover", "Move"),
    plantillas: [E2("Habla de otra ciudad", "It’s about another city"), E2("La publicó en la ciudad equivocada", "Posted in the wrong city")], nota: "interna", hacer: (m, e) => pubMoverCiudad(x.id, e ?? "", m),
  });
  // «Ocultar los N reportados» (MEM 651): el servidor da la lista y decide cada uno; aquí solo se cuenta el progreso y los fallos.
  const enLote = () => setConf({
    titulo: E2(`Ocultar ${d.cab.lote} reportados`, `Hide ${d.cab.lote} reported`), sub: E2("Publicaciones y comentarios de la Comunidad que se ven y tienen un reporte abierto. Cada autor recibe el motivo y puede apelar; quienes reportaron, el resultado. La cuenta oficial no se oculta en lote.", "Visible Community posts and comments with an open report. Each author gets the reason and can appeal; reporters get the result. The official account is never hidden in bulk."),
    peligro: true, cta: E2("Ocultar en lote", "Hide in bulk"), plantillas: PLANT.hide,
    nota: "persona", hacer: async (motivo) => {
      const L = await loteReportados();
      if (!L.ok) return { ok: false, mensaje: L.mensaje ?? E2("No se pudo.", "It didn’t work.") };
      setConf(null); setLote({ total: L.items.length, hechos: 0, fallos: [], fin: false });
      const fallos: { texto: string; motivo: string }[] = [];
      for (let i = 0; i < L.items.length; i++) {
        const x = L.items[i]!;
        const r = await loteOcultarUno(x.k, x.id, motivo).catch(() => ({ ok: false, mensaje: E2("Sin conexión.", "No connection.") }) as ResAdm);
        if (!r.ok) fallos.push({ texto: x.texto, motivo: r.mensaje ?? E2("No se pudo.", "It didn’t work.") });
        setLote({ total: L.items.length, hechos: i + 1, fallos: [...fallos], fin: false });
      }
      setLote({ total: L.items.length, hechos: L.items.length, fallos, fin: true });
      router.refresh();
      return { ok: true, mensaje: E2("Lote terminado.", "Batch done.") };
    },
  });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CONTENIDO", "CONTENT"), t: E2("Contenido", "Content"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const c = d.cab;
  const bloques: Bloque[] = [
    { type: "head", eye: E2("CONTENIDO Y OFERTA", "CONTENT AND LISTINGS"), t: E2("Contenido", "Content"), s: E2("Comunidad, comentarios, Hoy en el barrio y reseñas: todo lo que escribe un vecino o un negocio. Ocultar avisa al autor con el motivo y abre apelación; nada se borra.", "Community, comments, Today in the neighborhood and reviews: everything a neighbor or business writes. Hiding notifies the author with the reason and opens an appeal; nothing is deleted."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("PUBLICACIONES", "POSTS"), v: String(c.pub), s: E2(`${c.ccm} comentarios · ${c.rev} reseñas`, `${c.ccm} comments · ${c.rev} reviews`) }, { k: E2("REPORTES ABIERTOS", "OPEN REPORTS"), v: String(c.rep), s: c.rep ? "SLA 24 h" : E2("al día", "up to date"), bg: c.rep ? "var(--tl-ink)" : undefined, fg: c.rep ? "var(--tl-white)" : undefined, onClick: c.rep ? () => router.push("/admin/colas?cola=rep") : undefined },
      { k: E2("HOY EN EL BARRIO", "TODAY IN THE NEIGHBORHOOD"), v: String(c.hoy), s: E2("avisos de 24 h", "24 h posts"), onClick: () => router.push("/admin/contenido?tab=hoy") }, { k: E2("OCULTOS", "HIDDEN"), v: String(c.hid), s: E2("restaurables", "restorable") },
    ] },
    { type: "tabs", items: ([["all", E2("Todo", "All")], ["pub", E2("Publicaciones", "Posts")], ["ccm", E2("Comentarios", "Comments")], ["hoy", E2("Hoy en el barrio", "Today in the neighborhood")], ["rev", E2("Reseñas", "Reviews")], ["auto", E2("Auto-moderación", "Auto-moderation")], ["off", E2("Cuenta oficial", "Official account")], ["anf", E2("Anfitriones", "Hosts")]] as const).map(([k, l]) => ({ l, on: tab === k, onClick: () => router.push(k === "all" ? "/admin/contenido" : `/admin/contenido?tab=${k}`) })) },
  ];
  if (auto) return <AutoModeracion d={auto} edita={editaCom} arriba={bloques} />;
  if (hoy) return <HoyAdmin d={hoy} puede={puedeCom} arriba={bloques} />;
  if (oficial) return <OficialAdmin d={oficial} escribe={escribeOficial} arriba={bloques} />;
  if (anf) return <AnfitrionesAdmin d={anf} edita={editaCom} arriba={bloques} />;
  const chip = (l: string, on: boolean, p: Record<string, string | null>) => ({ l, v: on ? "selected" : "filter", onClick: () => ir(p) });
  const despues: Bloque[] = [
    ...(f.tab === "all" ? [{ type: "chips" as const, k: E2("TIPO", "TYPE"), items: [chip(E2("Todos", "All"), !f.tipo, { tipo: null }), ...TIPOS_L(E2).map(([k, l]) => chip(l, f.tipo === k, { tipo: f.tipo === k ? null : k }))] }] : []),
    ...(d.ciudades.length > 1 ? [{ type: "chips" as const, k: E2("CIUDAD", "CITY"), items: [chip(E2("Todas", "All"), !f.ciudad, { ciudad: null }), ...d.ciudades.map((x) => chip(x.name, f.ciudad === x.id, { ciudad: f.ciudad === x.id ? null : x.id }))] }] : []),
    { type: "chips", k: E2("ESTADO Y VOTOS", "STATUS AND VOTES"), items: [chip(E2("Se ven", "Visible"), f.estado === "vis", { est: f.estado === "vis" ? null : "vis", hid: null }), chip(E2("Ocultos", "Hidden"), f.estado === "hid", { est: f.estado === "hid" ? null : "hid", hid: null }),
      chip(E2("Con reporte", "Reported"), f.rep, { rep: f.rep ? null : "1" }), chip(E2("Votos negativos", "Downvoted"), f.neg, { neg: f.neg ? null : "1" }), chip(E2("10+ votos", "10+ votes"), f.top, { top: f.top ? null : "1" }), chip(E2("De invitados", "From guests"), f.inv, { inv: f.inv ? null : "1" })] },
    { type: "chips", k: E2("RANGO DEL AUTOR", "AUTHOR RANK"), items: [chip(E2("Cualquiera", "Any"), !f.rango, { rk: null }), ...[4, 7, 9].map((n) => chip(E2(`${n} o más`, `${n} or more`), f.rango === n, { rk: f.rango === n ? null : String(n) }))] },
    ...(f.autor ? [{ type: "note" as const, tone: "info" as const, icon: "users", t: E2("Solo lo de una persona (desde Usuarios 360°).", "Only one person’s (from Users 360°)."), cta: E2("Quitar", "Remove"), onCta: () => ir({ autor: null }) }] : []),
  ];
  // AO · Una voz de la casa: su marca junto al nombre en la lista.
  const quien = (x: FilaCont) => (x.anf ? `${x.who} · ${marcaAnfitrion(x.anf, !EN)}` : x.who);
  const verHilo = (x: FilaCont) => router.push(x.k === "ccm" ? `/admin/contenido/hilo/${x.extra}?c=${x.id}` : `/admin/contenido/hilo/${x.id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.6)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E2("Texto, autor o negocio", "Text, author or business")} aria-label={E2("Buscar contenido", "Search content")}
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={despues} />
      {lote ? <A.BatchProgress label={E2("OCULTAR REPORTADOS", "HIDE REPORTED")} done={lote.hechos} total={lote.total} end={lote.fin} failed={lote.fallos.length}
        summary={lote.fallos.length ? E2(`${lote.total - lote.fallos.length} ocultos. No se pudieron ${lote.fallos.length}: `, `${lote.total - lote.fallos.length} hidden. ${lote.fallos.length} failed: `) + lote.fallos.map((x) => `«${x.texto.slice(0, 40)}» (${x.motivo})`).join(" · ") : E2(`${lote.total} ocultos. Cada autor recibió el motivo y puede apelar.`, `${lote.total} hidden. Each author got the reason and can appeal.`)}
        runningLabel={E2("Ocultando…", "Hiding…")} doneLabel={E2("Terminado", "Done")} onClose={() => setLote(null)} closeLabel={E2("Cerrar", "Close")} /> : null}
      {desk && puedeCom && c.lote > 0 && !lote ? <PanelBloques bloques={[{ type: "acts", pt: "0", items: [{ l: E2(`Ocultar los ${c.lote} reportados`, `Hide the ${c.lote} reported`), v: "danger", icon: "ban", onClick: enLote }] }]} /> : null}
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E2("Nada aquí", "Nothing here"), s: E2("Nada coincide con ese filtro.", "Nothing matches that filter.") }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: TIPO[x.k][1], title: x.text || E2("(sin texto)", "(no text)"),
          sub: x.k === "ccm" ? `${TIPO.ccm[0]} · ${quien(x)}${!x.anf && x.rango && x.rango >= 4 ? ` · ${E2("rango", "rank")} ${x.rango}` : ""}${x.bname ? ` · ${E2("recomienda", "recommends")} ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora, E2)}${x.hidden && x.why ? ` · ${E2("Oculto", "Hidden")}: ${x.why}` : ""}`
            : x.k === "pub" ? `${PB[x.extra ?? ""] ?? PB.publicacion} · ${quien(x)}${x.oficial || x.anf ? "" : x.rango && x.rango >= 4 ? ` · ${E2("rango", "rank")} ${x.rango}` : ""}${x.inv ? E2(" · invitado", " · guest") : ""}${x.bname ? ` · ${E2("recomienda", "recommends")} ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora, E2)}${x.pin ? E2(" · Fijada", " · Pinned") : ""}${x.lock ? E2(" · Comentarios bloqueados", " · Comments locked") : ""}${x.hidden && x.why ? ` · ${E2("Oculta", "Hidden")}: ${x.why}` : ""}`
            : `${TIPO[x.k][0]} · ${x.who}${x.who !== x.bname ? ` · ${x.bname}` : ""}${x.k === "rev" && x.extra ? ` · ${x.extra} ★` : x.k === "vac" && x.extra ? ` · ${x.extra}` : x.k === "cm" && x.extra ? ` · ${E2("en", "on")} «${x.extra}»` : ""} · ${x.ciudad} · ${x.k === "vac" ? E2(`${x.up} solicitudes`, `${x.up} applications`) : `+${x.up}${x.dn ? ` / −${x.dn}` : ""}`} · ${hace(x.at, ahora, E2)}${x.hidden && x.why ? ` · ${E2("Oculto", "Hidden")}: ${x.why}` : ""}`,
          tag: x.hidden ? E2("OCULTO", "HIDDEN") : x.anf ? marcaAnfitrion(x.anf, !EN)!.toUpperCase() : x.oficial ? E2("CUENTA OFICIAL", "OFFICIAL ACCOUNT") : x.rep ? E2(`REPORTADO · ${x.rep}`, `REPORTED · ${x.rep}`) : undefined, tone: x.hidden ? "danger" : "action",
          actions: x.k === "ccm" ? [
            ...(puedeCom ? [x.hidden ? { label: E2("Restaurar", "Restore"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E2("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) }] : []),
            { label: E2("Ver hilo", "View thread"), variant: "secondary", onClick: () => verHilo(x) },
          ] : x.k === "pub" ? [
            ...(puedeCom ? [x.hidden ? { label: E2("Restaurar", "Restore"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E2("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) }] : []),
            ...(editaCom && !x.hidden ? [{ label: x.pin ? E2("Desfijar", "Unpin") : E2("Fijar", "Pin"), variant: "secondary", onClick: () => void pubAccion(x, "fijar") }, { label: x.lock ? E2("Abrir comentarios", "Open comments") : E2("Bloquear comentarios", "Lock comments"), variant: "secondary", onClick: () => void pubAccion(x, "comentarios") }] : []),
            ...(editaCom && d.destinos.length > 1 ? [{ label: E2("Mover de ciudad", "Move city"), variant: "secondary", onClick: () => mover(x) }] : []),
            { label: E2("Ver hilo", "View thread"), variant: "secondary", onClick: () => verHilo(x) },
          ] : puede ? [x.hidden ? { label: E2("Mostrar", "Show"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E2("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) },
            { label: E2("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }] : [{ label: E2("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
        }))} />}
      {f.c || d.sig ? <A.Pager label={E2(`${d.filas.length} en esta página · ${porPagina} por página`, `${d.filas.length} on this page · ${porPagina} per page`)} hasPrev={!!f.c} hasNext={!!d.sig} onPrev={() => router.back()} onNext={() => d.sig && ir({ c: d.sig })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
