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
import { useAhora } from "@/lib/ahora";
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon" | "BatchProgress", ComponentType<any>>;

type EF = (es: string, en: string) => string;
const TIPO_ES: Record<FilaCont["k"], [string, string]> = { rev: ["Reseña", "star"], nov: ["Novedad", "news"], cm: ["Comentario", "chat"], vac: ["Vacante", "brief"], pub: ["Publicación", "users"], ccm: ["Comentario de vecino", "bubble"] };
const TIPO_EN: Record<FilaCont["k"], string> = { rev: "Review", nov: "Update", cm: "Comment", vac: "Job", pub: "Post", ccm: "Neighbor comment" };
const PUB = (E: EF): Record<string, string> => ({ pregunta: E("Pregunta", "Question"), recomendacion: E("Recomendación", "Recommendation"), encuesta: E("Encuesta", "Poll"), publicacion: E("Publicación", "Post") });
const hace = (iso: string, ahora: number, E: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("HACE UN MOMENTO", "JUST NOW") : h < 24 ? E(`HACE ${Math.floor(h)} H`, `${Math.floor(h)} H AGO`) : E(`HACE ${Math.floor(h / 24)} D`, `${Math.floor(h / 24)} D AGO`); };

type Lote = { total: number; hechos: number; fallos: { texto: string; motivo: string }[]; fin: boolean } | null;
const TIPOS_L = (E: EF): [FilaCont["k"], string][] => [["pub", E("Publicaciones", "Posts")], ["ccm", E("Comentarios de vecinos", "Neighbor comments")], ["rev", E("Reseñas", "Reviews")], ["nov", E("Novedades", "Updates")], ["cm", E("Comentarios de novedades", "Update comments")], ["vac", E("Vacantes", "Jobs")]];

export function Contenido({ d, f, porPagina, puede, puedeCom, editaCom, auto = null, hoy = null, oficial = null, escribeOficial = false, tab }: {
  d: ListaCont; f: FiltrosCont; porPagina: number; puede: boolean; puedeCom: boolean; editaCom: boolean; auto?: AutoMod | null; hoy?: DatosHoy | null; oficial?: CuentaOficial | null; escribeOficial?: boolean; tab: string;
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, E = useE();
  const EN = E("", "x") === "x", TIPO = Object.fromEntries(Object.entries(TIPO_ES).map(([k, v]) => [k, [EN ? TIPO_EN[k as FilaCont["k"]] : v[0], v[1]]])) as Record<FilaCont["k"], [string, string]>, PB = PUB(E);
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [lote, setLote] = useState<Lote>(null);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("c" in p)) u.delete("c"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const accion = (x: FilaCont, ocultar: boolean): Promise<ResAdm> => {
    const m = (motivo: string) => x.k === "ccm" ? cmComOcultar(x.id, ocultar, motivo) : x.k === "pub" ? pubOcultar(x.id, ocultar, motivo) : x.k === "rev" ? resenaOcultar(x.biz, x.id, ocultar, motivo) : x.k === "nov" ? novedadOcultar(x.biz, x.id, ocultar, motivo) : x.k === "cm" ? comentarioOcultar(x.biz, x.id, ocultar, motivo) : vacanteOcultar(x.biz, x.id, ocultar, motivo);
    return new Promise((ok) => setConf({
      titulo: ocultar ? (x.k === "pub" ? E(`Ocultar la publicación de ${x.who}`, `Hide ${x.who}’s post`) : x.k === "ccm" ? E(`Ocultar el comentario de ${x.who}`, `Hide ${x.who}’s comment`) : E(`Ocultar ${TIPO[x.k][0].toLowerCase()} de ${x.bname}`, `Hide ${TIPO[x.k][0].toLowerCase()} from ${x.bname}`)) : E(`¿Por qué vuelve esta ${TIPO[x.k][0].toLowerCase()}?`, `Why is this ${TIPO[x.k][0].toLowerCase()} coming back?`),
      sub: ocultar ? (x.k === "pub" ? E("Sale del muro y de la publicación para todos. El autor ve el motivo y puede apelar; queda en la auditoría.", "It leaves the wall and the post for everyone. The author sees the reason and can appeal; it stays in the audit log.") : x.k === "ccm" ? E("Sale del hilo para todos. El autor recibe el aviso con el motivo y puede apelar; queda en la auditoría.", "It leaves the thread for everyone. The author gets the notice with the reason and can appeal; it stays in the audit log.") : x.k === "vac" ? E("Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel.", "It leaves their page and no one new applies. The owner sees the reason in their dashboard.") : x.k === "rev" ? E("Sale de su página y de las estrellas. El autor ve el motivo.", "It leaves their page and the stars. The author sees the reason.") : E("Sale de su página. Queda en la auditoría.", "It leaves their page. It stays in the audit log.")) : x.k === "pub" ? E("Vuelve al muro y el autor recibe el aviso.", "It goes back to the wall and the author gets the notice.") : x.k === "ccm" ? E("Vuelve al hilo y el autor recibe el aviso.", "It goes back to the thread and the author gets the notice.") : undefined,
      peligro: ocultar, plantillas: ocultar ? (x.k === "vac" ? [E("Pide papeles, SSN o pago para aplicar", "Asks for papers, SSN or payment to apply"), E("Pago por debajo del mínimo", "Pay below minimum"), E("Vacante falsa o engañosa", "Fake or misleading job"), E("Discriminatoria", "Discriminatory")] : PLANT.hide) : PLANT.keep,
      hacer: async (motivo) => { const r = await m(motivo); ok(r); return r; },
    }));
  };
  const pubAccion = (x: FilaCont, que: "fijar" | "comentarios"): Promise<ResAdm> => new Promise((ok) => setConf({
    titulo: que === "fijar" ? (x.pin ? E("¿Por qué se desfija?", "Why unpin it?") : E(`Fijar la publicación de ${x.who}`, `Pin ${x.who}’s post`)) : x.lock ? E("¿Por qué se abren los comentarios?", "Why reopen comments?") : E(`Bloquear los comentarios de ${x.who}`, `Lock comments on ${x.who}’s post`),
    sub: que === "fijar" ? (x.pin ? E("Deja de salir arriba del muro.", "It stops showing at the top of the wall.") : E("Sale arriba del muro de su ciudad 7 días, como fijada. Solo una a la vez; no cambia los votos de nadie.", "It shows at the top of its city’s wall for 7 days, pinned. Only one at a time; nobody’s votes change.")) : x.lock ? undefined : E("Nadie más comenta; lo que ya está se queda.", "No one else comments; what’s there stays."),
    peligro: false, plantillas: que === "fijar" ? [E("Aviso importante de la ciudad", "Important city notice"), E("Pregunta de la semana", "Question of the week"), E("Ya pasó", "It’s over")] : [E("Discusión fuera de control", "Discussion out of control"), E("Tema resuelto", "Topic resolved"), E("Revisado", "Reviewed")],
    hacer: async (motivo) => { const r = await (que === "fijar" ? pubFijar(x.id, !x.pin, motivo) : pubComentarios(x.id, !x.lock, motivo)); ok(r); return r; },
  }));
  const mover = (x: FilaCont) => setConf({
    titulo: E(`Mover la publicación de ${x.who}`, `Move ${x.who}’s post`), sub: E(`Está en ${x.ciudad}. Sale en el muro de la otra ciudad con sus comentarios; la ubicación la vuelve a poner el sistema (nunca la de la persona). Queda en la auditoría.`, `It’s in ${x.ciudad}. It shows on the other city’s wall with its comments; the system sets the location again (never the person’s). It stays in the audit log.`),
    elegir: { label: E("A QUÉ CIUDAD", "TO WHICH CITY"), items: d.destinos.filter((c) => c.name !== x.ciudad).map((c) => ({ k: c.id, l: c.name })) }, cta: E("Mover", "Move"),
    plantillas: [E("Habla de otra ciudad", "It’s about another city"), E("La publicó en la ciudad equivocada", "Posted in the wrong city")], hacer: (m, e) => pubMoverCiudad(x.id, e ?? "", m),
  });
  // «Ocultar los N reportados» (MEM 651): el servidor da la lista y decide cada uno; aquí solo se cuenta el progreso y los fallos.
  const enLote = () => setConf({
    titulo: E(`Ocultar ${d.cab.lote} reportados`, `Hide ${d.cab.lote} reported`), sub: E("Publicaciones y comentarios de la Comunidad que se ven y tienen un reporte abierto. Cada autor recibe el motivo y puede apelar; quienes reportaron, el resultado. La cuenta oficial no se oculta en lote.", "Visible Community posts and comments with an open report. Each author gets the reason and can appeal; reporters get the result. The official account is never hidden in bulk."),
    peligro: true, cta: E("Ocultar en lote", "Hide in bulk"), plantillas: PLANT.hide,
    hacer: async (motivo) => {
      const L = await loteReportados();
      if (!L.ok) return { ok: false, mensaje: L.mensaje ?? E("No se pudo.", "It didn’t work.") };
      setConf(null); setLote({ total: L.items.length, hechos: 0, fallos: [], fin: false });
      const fallos: { texto: string; motivo: string }[] = [];
      for (let i = 0; i < L.items.length; i++) {
        const x = L.items[i]!;
        const r = await loteOcultarUno(x.k, x.id, motivo).catch(() => ({ ok: false, mensaje: E("Sin conexión.", "No connection.") }) as ResAdm);
        if (!r.ok) fallos.push({ texto: x.texto, motivo: r.mensaje ?? E("No se pudo.", "It didn’t work.") });
        setLote({ total: L.items.length, hechos: i + 1, fallos: [...fallos], fin: false });
      }
      setLote({ total: L.items.length, hechos: L.items.length, fallos, fin: true });
      router.refresh();
      return { ok: true, mensaje: E("Lote terminado.", "Batch done.") };
    },
  });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("CONTENIDO", "CONTENT"), t: E("Contenido", "Content"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const c = d.cab;
  const bloques: Bloque[] = [
    { type: "head", eye: E("CONTENIDO Y OFERTA", "CONTENT AND LISTINGS"), t: E("Contenido", "Content"), s: E("Comunidad, comentarios, Hoy en el barrio y reseñas: todo lo que escribe un vecino o un negocio. Ocultar avisa al autor con el motivo y abre apelación; nada se borra.", "Community, comments, Today in the neighborhood and reviews: everything a neighbor or business writes. Hiding notifies the author with the reason and opens an appeal; nothing is deleted."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("PUBLICACIONES", "POSTS"), v: String(c.pub), s: E(`${c.ccm} comentarios · ${c.rev} reseñas`, `${c.ccm} comments · ${c.rev} reviews`) }, { k: E("REPORTES ABIERTOS", "OPEN REPORTS"), v: String(c.rep), s: c.rep ? "SLA 24 h" : E("al día", "up to date"), bg: c.rep ? "var(--tl-ink)" : undefined, fg: c.rep ? "var(--tl-white)" : undefined, onClick: c.rep ? () => router.push("/admin/colas?cola=rep") : undefined },
      { k: E("HOY EN EL BARRIO", "TODAY IN THE NEIGHBORHOOD"), v: String(c.hoy), s: E("avisos de 24 h", "24 h posts"), onClick: () => router.push("/admin/contenido?tab=hoy") }, { k: E("OCULTOS", "HIDDEN"), v: String(c.hid), s: E("restaurables", "restorable") },
    ] },
    { type: "tabs", items: ([["all", E("Todo", "All")], ["pub", E("Publicaciones", "Posts")], ["ccm", E("Comentarios", "Comments")], ["hoy", E("Hoy en el barrio", "Today in the neighborhood")], ["rev", E("Reseñas", "Reviews")], ["auto", E("Auto-moderación", "Auto-moderation")], ["off", E("Cuenta oficial", "Official account")]] as const).map(([k, l]) => ({ l, on: tab === k, onClick: () => router.push(k === "all" ? "/admin/contenido" : `/admin/contenido?tab=${k}`) })) },
  ];
  if (auto) return <AutoModeracion d={auto} edita={editaCom} arriba={bloques} />;
  if (hoy) return <HoyAdmin d={hoy} puede={puedeCom} arriba={bloques} />;
  if (oficial) return <OficialAdmin d={oficial} escribe={escribeOficial} arriba={bloques} />;
  const chip = (l: string, on: boolean, p: Record<string, string | null>) => ({ l, v: on ? "selected" : "filter", onClick: () => ir(p) });
  const despues: Bloque[] = [
    ...(f.tab === "all" ? [{ type: "chips" as const, k: E("TIPO", "TYPE"), items: [chip(E("Todos", "All"), !f.tipo, { tipo: null }), ...TIPOS_L(E).map(([k, l]) => chip(l, f.tipo === k, { tipo: f.tipo === k ? null : k }))] }] : []),
    ...(d.ciudades.length > 1 ? [{ type: "chips" as const, k: E("CIUDAD", "CITY"), items: [chip(E("Todas", "All"), !f.ciudad, { ciudad: null }), ...d.ciudades.map((x) => chip(x.name, f.ciudad === x.id, { ciudad: f.ciudad === x.id ? null : x.id }))] }] : []),
    { type: "chips", k: E("ESTADO Y VOTOS", "STATUS AND VOTES"), items: [chip(E("Se ven", "Visible"), f.estado === "vis", { est: f.estado === "vis" ? null : "vis", hid: null }), chip(E("Ocultos", "Hidden"), f.estado === "hid", { est: f.estado === "hid" ? null : "hid", hid: null }),
      chip(E("Con reporte", "Reported"), f.rep, { rep: f.rep ? null : "1" }), chip(E("Votos negativos", "Downvoted"), f.neg, { neg: f.neg ? null : "1" }), chip(E("10+ votos", "10+ votes"), f.top, { top: f.top ? null : "1" }), chip(E("De invitados", "From guests"), f.inv, { inv: f.inv ? null : "1" })] },
    { type: "chips", k: E("RANGO DEL AUTOR", "AUTHOR RANK"), items: [chip(E("Cualquiera", "Any"), !f.rango, { rk: null }), ...[4, 7, 9].map((n) => chip(E(`${n} o más`, `${n} or more`), f.rango === n, { rk: f.rango === n ? null : String(n) }))] },
    ...(f.autor ? [{ type: "note" as const, tone: "info" as const, icon: "users", t: E("Solo lo de una persona (desde Usuarios 360°).", "Only one person’s (from Users 360°)."), cta: E("Quitar", "Remove"), onCta: () => ir({ autor: null }) }] : []),
  ];
  const verHilo = (x: FilaCont) => router.push(x.k === "ccm" ? `/admin/contenido/hilo/${x.extra}?c=${x.id}` : `/admin/contenido/hilo/${x.id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E("Texto, autor o negocio", "Text, author or business")} aria-label={E("Buscar contenido", "Search content")}
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={despues} />
      {lote ? <A.BatchProgress label={E("OCULTAR REPORTADOS", "HIDE REPORTED")} done={lote.hechos} total={lote.total} end={lote.fin} failed={lote.fallos.length}
        summary={lote.fallos.length ? E(`${lote.total - lote.fallos.length} ocultos. No se pudieron ${lote.fallos.length}: `, `${lote.total - lote.fallos.length} hidden. ${lote.fallos.length} failed: `) + lote.fallos.map((x) => `«${x.texto.slice(0, 40)}» (${x.motivo})`).join(" · ") : E(`${lote.total} ocultos. Cada autor recibió el motivo y puede apelar.`, `${lote.total} hidden. Each author got the reason and can appeal.`)}
        runningLabel={E("Ocultando…", "Hiding…")} doneLabel={E("Terminado", "Done")} onClose={() => setLote(null)} closeLabel={E("Cerrar", "Close")} /> : null}
      {desk && puedeCom && c.lote > 0 && !lote ? <PanelBloques bloques={[{ type: "acts", pt: "0", items: [{ l: E(`Ocultar los ${c.lote} reportados`, `Hide the ${c.lote} reported`), v: "danger", icon: "ban", onClick: enLote }] }]} /> : null}
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E("Nada aquí", "Nothing here"), s: E("Nada coincide con ese filtro.", "Nothing matches that filter.") }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: TIPO[x.k][1], title: x.text || E("(sin texto)", "(no text)"),
          sub: x.k === "ccm" ? `${TIPO.ccm[0]} · ${x.who}${x.rango && x.rango >= 4 ? ` · ${E("rango", "rank")} ${x.rango}` : ""}${x.bname ? ` · ${E("recomienda", "recommends")} ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora, E)}${x.hidden && x.why ? ` · ${E("Oculto", "Hidden")}: ${x.why}` : ""}`
            : x.k === "pub" ? `${PB[x.extra ?? ""] ?? PB.publicacion} · ${x.who}${x.oficial ? "" : x.rango && x.rango >= 4 ? ` · ${E("rango", "rank")} ${x.rango}` : ""}${x.inv ? E(" · invitado", " · guest") : ""}${x.bname ? ` · ${E("recomienda", "recommends")} ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora, E)}${x.pin ? E(" · Fijada", " · Pinned") : ""}${x.lock ? E(" · Comentarios bloqueados", " · Comments locked") : ""}${x.hidden && x.why ? ` · ${E("Oculta", "Hidden")}: ${x.why}` : ""}`
            : `${TIPO[x.k][0]} · ${x.who}${x.who !== x.bname ? ` · ${x.bname}` : ""}${x.k === "rev" && x.extra ? ` · ${x.extra} ★` : x.k === "vac" && x.extra ? ` · ${x.extra}` : x.k === "cm" && x.extra ? ` · ${E("en", "on")} «${x.extra}»` : ""} · ${x.ciudad} · ${x.k === "vac" ? E(`${x.up} solicitudes`, `${x.up} applications`) : `+${x.up}${x.dn ? ` / −${x.dn}` : ""}`} · ${hace(x.at, ahora, E)}${x.hidden && x.why ? ` · ${E("Oculto", "Hidden")}: ${x.why}` : ""}`,
          tag: x.hidden ? E("OCULTO", "HIDDEN") : x.oficial ? E("CUENTA OFICIAL", "OFFICIAL ACCOUNT") : x.rep ? E(`REPORTADO · ${x.rep}`, `REPORTED · ${x.rep}`) : undefined, tone: x.hidden ? "danger" : "action",
          actions: x.k === "ccm" ? [
            ...(puedeCom ? [x.hidden ? { label: E("Restaurar", "Restore"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) }] : []),
            { label: E("Ver hilo", "View thread"), variant: "secondary", onClick: () => verHilo(x) },
          ] : x.k === "pub" ? [
            ...(puedeCom ? [x.hidden ? { label: E("Restaurar", "Restore"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) }] : []),
            ...(editaCom && !x.hidden ? [{ label: x.pin ? E("Desfijar", "Unpin") : E("Fijar", "Pin"), variant: "secondary", onClick: () => void pubAccion(x, "fijar") }, { label: x.lock ? E("Abrir comentarios", "Open comments") : E("Bloquear comentarios", "Lock comments"), variant: "secondary", onClick: () => void pubAccion(x, "comentarios") }] : []),
            ...(editaCom && d.destinos.length > 1 ? [{ label: E("Mover de ciudad", "Move city"), variant: "secondary", onClick: () => mover(x) }] : []),
            { label: E("Ver hilo", "View thread"), variant: "secondary", onClick: () => verHilo(x) },
          ] : puede ? [x.hidden ? { label: E("Mostrar", "Show"), variant: "secondary", onClick: () => void accion(x, false) } : { label: E("Ocultar", "Hide"), variant: "danger", onClick: () => void accion(x, true) },
            { label: E("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }] : [{ label: E("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
        }))} />}
      {f.c || d.sig ? <A.Pager label={E(`${d.filas.length} en esta página · ${porPagina} por página`, `${d.filas.length} on this page · ${porPagina} per page`)} hasPrev={!!f.c} hasNext={!!d.sig} onPrev={() => router.back()} onNext={() => d.sig && ir({ c: d.sig })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
