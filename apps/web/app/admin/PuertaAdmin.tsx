"use client";
/* 6g · ADM-EVT › Modo puerta (Super Admin.dc.html secEvt: «modo puerta en solo lectura para disputas de "me cobraron y no entré"»):
   las puertas abiertas ahora y las fechas recientes con escaneos; de una fecha, ADENTRO · FALTAN · RECHAZADOS · REPETIDOS, por puerta, los
   últimos en la puerta, las sesiones de portero y las incidencias. Solo lectura; se pone al día cada 10 s. Sin teléfonos ni montos. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { diaCorto } from "@/lib/evt-comun";
import { lineaUltimo, RESULTADO, textoIncidencia } from "@/lib/puerta-comun";
import type { puertaAdmin, PuertaAdm } from "@/lib/puerta-admin";
import { useAncho } from "./Colas";

export function PuertaAdmin({ lista, d }: { lista: { ahora: PuertaAdm[]; recientes: PuertaAdm[] }; d: Awaited<ReturnType<typeof puertaAdmin>> }) {
  const router = useRouter(), path = usePathname(), w = useAncho(), desk = w >= 1024;
  useEffect(() => { const x = setInterval(() => router.refresh(), 10000); return () => clearInterval(x); }, [router]);
  const B: Bloque[] = [
    { type: "head", eye: "CONTENIDO Y OFERTA · EVENTOS Y BOLETOS", t: "Modo puerta", s: "Solo lectura: lo que pasa en cada puerta, para revisar un «me cobraron y no entré». Nadie vende en la puerta.", h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Eventos", on: false, onClick: () => router.push("/admin/eventos") }, { l: "Buscar boleto", on: false, onClick: () => router.push("/admin/eventos?tab=bol") }, { l: "Modo puerta", on: true, onClick: () => router.push(path) }, { l: "Organizadores", on: false, onClick: () => router.push("/admin/eventos?tab=org") }] },
  ];
  const fila = (x: PuertaAdm): Fila => ({ key: x.fecha, icon: "key", t: x.titulo.es, s: `${x.negocio} · ${x.ciudad} · ${diaCorto(x.dia, true)} · ${x.h0} · adentro ${x.r.adentro} · faltan ${x.r.faltan} · rechazados ${x.r.rechazados} · repetidos ${x.r.repetidos}`,
    tag: x.abiertas ? `${x.abiertas} ${x.abiertas === 1 ? "PUERTA ABIERTA" : "PUERTAS ABIERTAS"}` : x.ahora ? "SIN PUERTA ABIERTA" : "CERRADA", tone: x.abiertas ? "signal" : "neutral", chev: true, onClick: () => router.push(`${path}?fecha=${x.fecha}`) });
  if (d) {
    B.push({ type: "head", eye: `${d.negocio.toUpperCase()} · ${d.ciudad.toUpperCase()} · ${diaCorto(d.dia, true).toUpperCase()} · ${d.h0}`, t: d.titulo.es, onBack: () => router.push(path) });
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "ADENTRO", v: String(d.r.adentro), s: d.r.aforo ? `de ${d.r.aforo} · ${d.r.pct} %` : "sin aforo", bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: "FALTAN", v: String(d.r.faltan), s: `de ${d.r.esperados}` },
      { k: "RECHAZADOS", v: String(d.r.rechazados) }, { k: "REPETIDOS", v: String(d.r.repetidos), s: "ya habían entrado" }] });
    if (d.puertas.length) B.push({ type: "rows", k: "POR PUERTA", items: d.puertas.map((p, i): Fila => ({ key: `p${i}`, icon: "key", t: p.puerta, s: `adentro ${p.adentro} · rechazados ${p.rechazados} · repetidos ${p.repetidos}`, r: String(p.entraron), compact: true, chev: false })) });
    B.push(d.equipo.length ? { type: "rows", k: "SESIONES DE PORTERO · CADA UNA ES UN TELÉFONO", items: d.equipo.map((x): Fila => ({ key: x.sesion, icon: "users", t: `${x.nombre}${x.miembro ? " · equipo del negocio" : ""}`,
      s: `Puerta ${x.puerta} · desde ${x.desde}${x.ultimo ? ` · último ${x.ultimo}` : ""} · ${x.rechazos} rechazos${x.sinConexion ? ` · ${x.sinConexion} sin conexión (subió ${x.subio})` : ""}${x.repetidos ? ` · ${x.repetidos} repetidos` : ""}${x.desfase != null ? ` · reloj ${x.desfase > 0 ? "atrasado" : "adelantado"} ${Math.abs(Math.round(x.desfase / 1000))} s` : ""}`, r: String(x.entradas),
      tag: x.activa ? "ABIERTA" : x.cerradaPor === "revoked" ? "REVOCADO" : "CERRADA", tone: x.activa ? "signal" : x.cerradaPor === "revoked" ? "danger" : "neutral", compact: true, chev: false })) } : { type: "note", tone: "info", icon: "key", t: "Ninguna puerta abierta ahora." });
    B.push(d.ultimos.length ? { type: "rows", k: "ÚLTIMOS EN LA PUERTA", items: d.ultimos.map((x): Fila => ({ key: x.id, icon: RESULTADO[x.res].tono === "bad" ? "warning" : "check", t: x.nombre, s: lineaUltimo(x, true), m: x.hora, compact: true, chev: false,
      ibg: RESULTADO[x.res].tono === "bad" ? "rgba(192,57,43,.1)" : "rgba(0,229,196,.18)", ifg: RESULTADO[x.res].tono === "bad" ? "var(--tl-danger)" : "var(--tl-open-text)" })) } : { type: "empty", icon: "ticket", t: "Todavía nadie pasó por la puerta", s: "Aquí sale cada escaneo con su resultado, la puerta y la hora." });
    if (d.incidencias.length) B.push({ type: "rows", k: "INCIDENCIAS", items: d.incidencias.map((x): Fila => ({ key: x.id, icon: textoIncidencia(x, true).icon, t: textoIncidencia(x, true).t, s: textoIncidencia(x, true).s, m: x.hora,
      tag: x.st === "open" ? "ABIERTA" : "CERRADA", tone: x.st === "open" ? "pro" : "neutral", compact: true, chev: false })) });
    B.push({ type: "note", tone: "info", icon: "ticket", t: "Para un boleto en particular: Buscar boleto → su ficha → ESCANEOS (quién lo escaneó, en qué puerta y a qué hora)." });
  } else {
    B.push(lista.ahora.length ? { type: "rows", k: `AHORA · ${lista.ahora.length}`, items: lista.ahora.map(fila) } : { type: "empty", icon: "key", t: "Ninguna puerta abierta ahora", s: "Las puertas se abren el día del evento, 2 horas antes de las puertas." });
    if (lista.recientes.length) B.push({ type: "rows", k: "ÚLTIMOS 7 DÍAS", items: lista.recientes.map(fila) });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></div>;
}
