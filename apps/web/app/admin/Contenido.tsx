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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon" | "BatchProgress", ComponentType<any>>;

const TIPO: Record<FilaCont["k"], [string, string]> = { rev: ["Reseña", "star"], nov: ["Novedad", "news"], cm: ["Comentario", "chat"], vac: ["Vacante", "brief"], pub: ["Publicación", "users"], ccm: ["Comentario de vecino", "bubble"] };
const PUB: Record<string, string> = { pregunta: "Pregunta", recomendacion: "Recomendación", encuesta: "Encuesta", publicacion: "Publicación" };
const hace = (iso: string, ahora: number) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "HACE UN MOMENTO" : h < 24 ? `HACE ${Math.floor(h)} H` : `HACE ${Math.floor(h / 24)} D`; };

type Lote = { total: number; hechos: number; fallos: { texto: string; motivo: string }[]; fin: boolean } | null;
const TIPOS_L: [FilaCont["k"], string][] = [["pub", "Publicaciones"], ["ccm", "Comentarios de vecinos"], ["rev", "Reseñas"], ["nov", "Novedades"], ["cm", "Comentarios de novedades"], ["vac", "Vacantes"]];

export function Contenido({ d, f, porPagina, puede, puedeCom, editaCom, auto = null, hoy = null, oficial = null, escribeOficial = false, tab }: {
  d: ListaCont; f: FiltrosCont; porPagina: number; puede: boolean; puedeCom: boolean; editaCom: boolean; auto?: AutoMod | null; hoy?: DatosHoy | null; oficial?: CuentaOficial | null; escribeOficial?: boolean; tab: string;
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [lote, setLote] = useState<Lote>(null);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("c" in p)) u.delete("c"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const accion = (x: FilaCont, ocultar: boolean): Promise<ResAdm> => {
    const m = (motivo: string) => x.k === "ccm" ? cmComOcultar(x.id, ocultar, motivo) : x.k === "pub" ? pubOcultar(x.id, ocultar, motivo) : x.k === "rev" ? resenaOcultar(x.biz, x.id, ocultar, motivo) : x.k === "nov" ? novedadOcultar(x.biz, x.id, ocultar, motivo) : x.k === "cm" ? comentarioOcultar(x.biz, x.id, ocultar, motivo) : vacanteOcultar(x.biz, x.id, ocultar, motivo);
    return new Promise((ok) => setConf({
      titulo: ocultar ? (x.k === "pub" ? `Ocultar la publicación de ${x.who}` : x.k === "ccm" ? `Ocultar el comentario de ${x.who}` : `Ocultar ${TIPO[x.k][0].toLowerCase()} de ${x.bname}`) : `¿Por qué vuelve esta ${TIPO[x.k][0].toLowerCase()}?`,
      sub: ocultar ? (x.k === "pub" ? "Sale del muro y de la publicación para todos. El autor ve el motivo y puede apelar; queda en la auditoría." : x.k === "ccm" ? "Sale del hilo para todos. El autor recibe el aviso con el motivo y puede apelar; queda en la auditoría." : x.k === "vac" ? "Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel." : x.k === "rev" ? "Sale de su página y de las estrellas. El autor ve el motivo." : "Sale de su página. Queda en la auditoría.") : x.k === "pub" ? "Vuelve al muro y el autor recibe el aviso." : x.k === "ccm" ? "Vuelve al hilo y el autor recibe el aviso." : undefined,
      peligro: ocultar, plantillas: ocultar ? (x.k === "vac" ? ["Pide papeles, SSN o pago para aplicar", "Pago por debajo del mínimo", "Vacante falsa o engañosa", "Discriminatoria"] : PLANT.hide) : PLANT.keep,
      hacer: async (motivo) => { const r = await m(motivo); ok(r); return r; },
    }));
  };
  const pubAccion = (x: FilaCont, que: "fijar" | "comentarios"): Promise<ResAdm> => new Promise((ok) => setConf({
    titulo: que === "fijar" ? (x.pin ? "¿Por qué se desfija?" : `Fijar la publicación de ${x.who}`) : x.lock ? "¿Por qué se abren los comentarios?" : `Bloquear los comentarios de ${x.who}`,
    sub: que === "fijar" ? (x.pin ? "Deja de salir arriba del muro." : "Sale arriba del muro de su ciudad 7 días, como fijada. Solo una a la vez; no cambia los votos de nadie.") : x.lock ? undefined : "Nadie más comenta; lo que ya está se queda.",
    peligro: false, plantillas: que === "fijar" ? ["Aviso importante de la ciudad", "Pregunta de la semana", "Ya pasó"] : ["Discusión fuera de control", "Tema resuelto", "Revisado"],
    hacer: async (motivo) => { const r = await (que === "fijar" ? pubFijar(x.id, !x.pin, motivo) : pubComentarios(x.id, !x.lock, motivo)); ok(r); return r; },
  }));
  const mover = (x: FilaCont) => setConf({
    titulo: `Mover la publicación de ${x.who}`, sub: `Está en ${x.ciudad}. Sale en el muro de la otra ciudad con sus comentarios; la ubicación la vuelve a poner el sistema (nunca la de la persona). Queda en la auditoría.`,
    elegir: { label: "A QUÉ CIUDAD", items: d.destinos.filter((c) => c.name !== x.ciudad).map((c) => ({ k: c.id, l: c.name })) }, cta: "Mover",
    plantillas: ["Habla de otra ciudad", "La publicó en la ciudad equivocada"], hacer: (m, e) => pubMoverCiudad(x.id, e ?? "", m),
  });
  // «Ocultar los N reportados» (MEM 651): el servidor da la lista y decide cada uno; aquí solo se cuenta el progreso y los fallos.
  const enLote = () => setConf({
    titulo: `Ocultar ${d.cab.lote} reportados`, sub: "Publicaciones y comentarios de la Comunidad que se ven y tienen un reporte abierto. Cada autor recibe el motivo y puede apelar; quienes reportaron, el resultado. La cuenta oficial no se oculta en lote.",
    peligro: true, cta: "Ocultar en lote", plantillas: PLANT.hide,
    hacer: async (motivo) => {
      const L = await loteReportados();
      if (!L.ok) return { ok: false, mensaje: L.mensaje ?? "No se pudo." };
      setConf(null); setLote({ total: L.items.length, hechos: 0, fallos: [], fin: false });
      const fallos: { texto: string; motivo: string }[] = [];
      for (let i = 0; i < L.items.length; i++) {
        const x = L.items[i]!;
        const r = await loteOcultarUno(x.k, x.id, motivo).catch(() => ({ ok: false, mensaje: "Sin conexión." }) as ResAdm);
        if (!r.ok) fallos.push({ texto: x.texto, motivo: r.mensaje ?? "No se pudo." });
        setLote({ total: L.items.length, hechos: i + 1, fallos: [...fallos], fin: false });
      }
      setLote({ total: L.items.length, hechos: L.items.length, fallos, fin: true });
      router.refresh();
      return { ok: true, mensaje: "Lote terminado." };
    },
  });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO", t: "Contenido", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const c = d.cab;
  const bloques: Bloque[] = [
    { type: "head", eye: "CONTENIDO Y OFERTA", t: "Contenido", s: "Comunidad, comentarios, Hoy en el barrio y reseñas: todo lo que escribe un vecino o un negocio. Ocultar avisa al autor con el motivo y abre apelación; nada se borra.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "PUBLICACIONES", v: String(c.pub), s: `${c.ccm} comentarios · ${c.rev} reseñas` }, { k: "REPORTES ABIERTOS", v: String(c.rep), s: c.rep ? "SLA 24 h" : "al día", bg: c.rep ? "var(--tl-ink)" : undefined, fg: c.rep ? "var(--tl-white)" : undefined, onClick: c.rep ? () => router.push("/admin/colas?cola=rep") : undefined },
      { k: "HOY EN EL BARRIO", v: String(c.hoy), s: "avisos de 24 h", onClick: () => router.push("/admin/contenido?tab=hoy") }, { k: "OCULTOS", v: String(c.hid), s: "restaurables" },
    ] },
    { type: "tabs", items: ([["all", "Todo"], ["pub", "Publicaciones"], ["ccm", "Comentarios"], ["hoy", "Hoy en el barrio"], ["rev", "Reseñas"], ["auto", "Auto-moderación"], ["off", "Cuenta oficial"]] as const).map(([k, l]) => ({ l, on: tab === k, onClick: () => router.push(k === "all" ? "/admin/contenido" : `/admin/contenido?tab=${k}`) })) },
  ];
  if (auto) return <AutoModeracion d={auto} edita={editaCom} arriba={bloques} />;
  if (hoy) return <HoyAdmin d={hoy} puede={puedeCom} arriba={bloques} />;
  if (oficial) return <OficialAdmin d={oficial} escribe={escribeOficial} arriba={bloques} />;
  const chip = (l: string, on: boolean, p: Record<string, string | null>) => ({ l, v: on ? "selected" : "filter", onClick: () => ir(p) });
  const despues: Bloque[] = [
    ...(f.tab === "all" ? [{ type: "chips" as const, k: "TIPO", items: [chip("Todos", !f.tipo, { tipo: null }), ...TIPOS_L.map(([k, l]) => chip(l, f.tipo === k, { tipo: f.tipo === k ? null : k }))] }] : []),
    ...(d.ciudades.length > 1 ? [{ type: "chips" as const, k: "CIUDAD", items: [chip("Todas", !f.ciudad, { ciudad: null }), ...d.ciudades.map((x) => chip(x.name, f.ciudad === x.id, { ciudad: f.ciudad === x.id ? null : x.id }))] }] : []),
    { type: "chips", k: "ESTADO Y VOTOS", items: [chip("Se ven", f.estado === "vis", { est: f.estado === "vis" ? null : "vis", hid: null }), chip("Ocultos", f.estado === "hid", { est: f.estado === "hid" ? null : "hid", hid: null }),
      chip("Con reporte", f.rep, { rep: f.rep ? null : "1" }), chip("Votos negativos", f.neg, { neg: f.neg ? null : "1" }), chip("10+ votos", f.top, { top: f.top ? null : "1" }), chip("De invitados", f.inv, { inv: f.inv ? null : "1" })] },
    { type: "chips", k: "RANGO DEL AUTOR", items: [chip("Cualquiera", !f.rango, { rk: null }), ...[4, 7, 9].map((n) => chip(`${n} o más`, f.rango === n, { rk: f.rango === n ? null : String(n) }))] },
    ...(f.autor ? [{ type: "note" as const, tone: "info" as const, icon: "users", t: "Solo lo de una persona (desde Usuarios 360°).", cta: "Quitar", onCta: () => ir({ autor: null }) }] : []),
  ];
  const verHilo = (x: FilaCont) => router.push(x.k === "ccm" ? `/admin/contenido/hilo/${x.extra}?c=${x.id}` : `/admin/contenido/hilo/${x.id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Texto, autor o negocio" aria-label="Buscar contenido"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={despues} />
      {lote ? <A.BatchProgress label="OCULTAR REPORTADOS" done={lote.hechos} total={lote.total} end={lote.fin} failed={lote.fallos.length}
        summary={lote.fallos.length ? `${lote.total - lote.fallos.length} ocultos. No se pudieron ${lote.fallos.length}: ${lote.fallos.map((x) => `«${x.texto.slice(0, 40)}» (${x.motivo})`).join(" · ")}` : `${lote.total} ocultos. Cada autor recibió el motivo y puede apelar.`}
        runningLabel="Ocultando…" doneLabel="Terminado" onClose={() => setLote(null)} closeLabel="Cerrar" /> : null}
      {desk && puedeCom && c.lote > 0 && !lote ? <PanelBloques bloques={[{ type: "acts", pt: "0", items: [{ l: `Ocultar los ${c.lote} reportados`, v: "danger", icon: "ban", onClick: enLote }] }]} /> : null}
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "chat", t: "Nada aquí", s: "Nada coincide con ese filtro." }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: TIPO[x.k][1], title: x.text || "(sin texto)",
          sub: x.k === "ccm" ? `Comentario de vecino · ${x.who}${x.rango && x.rango >= 4 ? ` · rango ${x.rango}` : ""}${x.bname ? ` · recomienda ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora)}${x.hidden && x.why ? ` · Oculto: ${x.why}` : ""}`
            : x.k === "pub" ? `${PUB[x.extra ?? ""] ?? "Publicación"} · ${x.who}${x.oficial ? "" : x.rango && x.rango >= 4 ? ` · rango ${x.rango}` : ""}${x.inv ? " · invitado" : ""}${x.bname ? ` · recomienda ${x.bname}` : ""} · ${x.ciudad} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${hace(x.at, ahora)}${x.pin ? " · Fijada" : ""}${x.lock ? " · Comentarios bloqueados" : ""}${x.hidden && x.why ? ` · Oculta: ${x.why}` : ""}`
            : `${TIPO[x.k][0]} · ${x.who}${x.who !== x.bname ? ` · ${x.bname}` : ""}${x.k === "rev" && x.extra ? ` · ${x.extra} ★` : x.k === "vac" && x.extra ? ` · ${x.extra}` : x.k === "cm" && x.extra ? ` · en «${x.extra}»` : ""} · ${x.ciudad} · ${x.k === "vac" ? `${x.up} solicitudes` : `+${x.up}${x.dn ? ` / −${x.dn}` : ""}`} · ${hace(x.at, ahora)}${x.hidden && x.why ? ` · Oculto: ${x.why}` : ""}`,
          tag: x.hidden ? "OCULTO" : x.oficial ? "CUENTA OFICIAL" : x.rep ? `REPORTADO · ${x.rep}` : undefined, tone: x.hidden ? "danger" : "action",
          actions: x.k === "ccm" ? [
            ...(puedeCom ? [x.hidden ? { label: "Restaurar", variant: "secondary", onClick: () => void accion(x, false) } : { label: "Ocultar", variant: "danger", onClick: () => void accion(x, true) }] : []),
            { label: "Ver hilo", variant: "secondary", onClick: () => verHilo(x) },
          ] : x.k === "pub" ? [
            ...(puedeCom ? [x.hidden ? { label: "Restaurar", variant: "secondary", onClick: () => void accion(x, false) } : { label: "Ocultar", variant: "danger", onClick: () => void accion(x, true) }] : []),
            ...(editaCom && !x.hidden ? [{ label: x.pin ? "Desfijar" : "Fijar", variant: "secondary", onClick: () => void pubAccion(x, "fijar") }, { label: x.lock ? "Abrir comentarios" : "Bloquear comentarios", variant: "secondary", onClick: () => void pubAccion(x, "comentarios") }] : []),
            ...(editaCom && d.destinos.length > 1 ? [{ label: "Mover de ciudad", variant: "secondary", onClick: () => mover(x) }] : []),
            { label: "Ver hilo", variant: "secondary", onClick: () => verHilo(x) },
          ] : puede ? [x.hidden ? { label: "Mostrar", variant: "secondary", onClick: () => void accion(x, false) } : { label: "Ocultar", variant: "danger", onClick: () => void accion(x, true) },
            { label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }] : [{ label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
        }))} />}
      {f.c || d.sig ? <A.Pager label={`${d.filas.length} en esta página · ${porPagina} por página`} hasPrev={!!f.c} hasNext={!!d.sig} onPrev={() => router.back()} onNext={() => d.sig && ir({ c: d.sig })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
