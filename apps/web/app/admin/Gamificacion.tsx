"use client";
/* 5f · ADM-GAM · Gamification (Super Admin.dc.html secGam): Rangos (los 10 con lo que piden y desbloquean, cuántos vecinos hay en cada uno,
   «Cambiar nombre» ES/EN con vista previa), Puntos (tope del día 50 · 100 · 150 · 200 y cada regla con su valor y su interruptor; las 4
   reglas fijas) y Tabla del Barrio (ciudad, mes en curso o anterior, excluir con motivo, «Cerrar el mes» con sus 4 pasos, solo Admin).
   Cada cambio pide motivo y queda en la auditoría; la Comunidad lo lee al instante. Solo bloques del sistema; el servidor decide.
   Monedas y Cupones llegan con el bloque 5g; El Patio, después de la apertura (G); «Rango del negocio» no se construye (§6 #23). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Gam } from "@/lib/admin-gam";
import { CUANDO_PATIO, REGLAS_PUNTOS, nombreMes } from "@/lib/puntos-comun";
import type { ResAdm } from "./acciones-colas";
import { gamCerrarMes, gamExcluir, gamRegla, gamRenombrar, gamTope } from "./acciones-gam";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

type Tab = "rk" | "pts" | "tabla";
const fecha = (d: string) => new Date(d).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });

export function Gamificacion({ d, tab, edita, admin }: { d: Gam; tab: Tab; edita: boolean; admin: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), desk = useAncho() >= 1024, cols = desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [nombre, setNombre] = useState<{ n: number; es: string; en: string } | null>(null);
  const [regla, setRegla] = useState<{ key: string; v: string; on: boolean } | null>(null);
  const nRef = useRef(nombre); nRef.current = nombre;
  const rRef = useRef(regla); rRef.current = regla;
  const ir = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v); } router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); setNombre(null); setRegla(null); router.refresh(); };
  const sinPermiso = () => setToast("Tu rol no edita Gamification.");
  const cerrarConf = () => { setConf(null); setNombre(null); setRegla(null); };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "GAMIFICATION", t: conf.titulo, onBack: cerrarConf, h1: desk ? 26 : 22 }]} />
      {nombre && <PanelBloques bloques={[
        { type: "field", k: "NOMBRE EN ESPAÑOL", val: nombre.es, max: 30, count: `${nombre.es.length}/30`, onChange: (v: string) => setNombre((x) => (x ? { ...x, es: v.slice(0, 30) } : x)) },
        { type: "field", k: "NOMBRE EN INGLÉS", val: nombre.en, max: 30, count: `${nombre.en.length}/30`, onChange: (v: string) => setNombre((x) => (x ? { ...x, en: v.slice(0, 30) } : x)) },
        { type: "group", k: "VISTA PREVIA · ASÍ SE VE EN LA COMUNIDAD" },
        { type: "rows", items: [{ key: "es", icon: "shield", t: `${nombre.n} · ${nombre.es || "—"}`, s: "Pastilla del rango, perfil, comentarios (desde Sargento) y la Tabla", m: `${nombre.n} · ${(nombre.es || "—").toUpperCase()}` },
          { key: "en", icon: "shield", t: `${nombre.n} · ${nombre.en || nombre.es || "—"}`, s: "In English", m: `${nombre.n} · ${(nombre.en || nombre.es || "—").toUpperCase()}` }] },
      ]} />}
      {regla && <PanelBloques bloques={[
        { type: "field", k: "PUNTOS · 0–100", val: regla.v, im: "numeric", max: 3, onChange: (v: string) => setRegla((x) => (x ? { ...x, v: v.replace(/[^\d]/g, "").slice(0, 3) } : x)) },
        { type: "rows", items: [{ key: "on", icon: "star", t: regla.on ? "Encendida" : "Apagada", s: "Apagada no da puntos desde ahora; lo ya ganado no cambia.", tgOn: regla.on, onTg: () => setRegla((x) => (x ? { ...x, on: !x.on } : x)) }] },
      ]} />}
      <ConfirmarMotivo c={{ ...conf, titulo: "¿Por qué?" }} desk={desk} onBack={cerrarConf} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const B: Bloque[] = [
    { type: "head", eye: "DINERO Y CRECIMIENTO", t: "Gamification", s: "Rangos, puntos y la Tabla del Barrio. Lo que cambies aquí lo ve la Comunidad al instante. Aquí nada se compra: los puntos salen de los votos de los vecinos.", h1: desk ? 26 : 22 },
    { type: "tabs", items: ([["rk", "Rangos", "10"], ["pts", "Puntos"], ["tabla", "Tabla del Barrio"]] as [Tab, string, string?][]).map(([k, l, n]) => ({ l, n, on: tab === k, onClick: () => ir({ tab: k === "rk" ? null : k }) })) },
  ];
  if (tab === "rk") {
    B.push({ type: "note", tone: "info", icon: "shield", t: "El rango solo sube: los puntos que se restan no lo bajan. Coronel lo da el equipo (Usuarios › 360° › Comunidad); General del Barrio son 3 plazas por ciudad: los 3 primeros del mes que ya son Comandante, al cerrar la Tabla." });
    B.push({ type: "rows", cols, items: d.rangos.map((r) => ({ key: String(r.n), icon: "shield", ibg: r.n >= 9 ? "var(--tl-ink)" : "rgba(75,55,245,.1)", ifg: r.n >= 9 ? "var(--tl-white)" : "var(--tl-action)",
      t: `${r.n} · ${r.name.es}`, s: `Para subir: ${r.req.es}${r.min != null ? ` · ${r.min.toLocaleString("en-US")} puntos` : ""} · EN: ${r.name.en}`, m: `DESBLOQUEA: ${r.unl.es}${r.patio ? ` · ${CUANDO_PATIO.es}` : ""}`.toUpperCase(),
      tag: r.editado ? "EDITADO" : undefined, tone: "action", r: String(r.vecinos),
      acts: edita ? [{ l: "Cambiar nombre", v: "secondary", icon: "edit", onClick: () => { setNombre({ n: r.n, es: r.name.es, en: r.name.en }); setConf({ titulo: `Nombre del rango ${r.n}`, sub: "Español e inglés. La Comunidad lo muestra al instante. Queda en la auditoría.", cta: "Guardar",
        plantillas: ["Lo pidió el fundador", "Más claro para los vecinos"], hacer: (m) => { const x = nRef.current; return x ? gamRenombrar(x.n, x.es, x.en, m) : Promise.resolve({ ok: false, mensaje: "Escribe el nombre." } as ResAdm); } }); } }] : undefined })) });
  }
  if (tab === "pts") {
    B.push({ type: "chips", k: "TOPE DIARIO POR PERSONA", items: [50, 100, 150, 200].map((v) => ({ l: `${v} al día`, v: d.tope === v ? "selected" : "filter",
      onClick: !edita ? sinPermiso : d.tope === v ? undefined : () => setConf({ titulo: "", sub: `Tope del día: ${d.tope} → ${v}. Lo que pasa del tope no se guarda.`, cta: "Guardar", plantillas: ["Mucha actividad legítima", "Más estricto contra granjas de votos"], hacer: (m) => gamTope(v, m) }) })) });
    B.push({ type: "rows", items: d.reglas.map((x) => ({ key: x.key, icon: "star", t: x.label.es, s: x.on ? "Encendida" : "Apagada: no da puntos", r: x.on ? `+${x.v}` : "—", dim: !x.on, tag: x.editado ? "EDITADO" : undefined, tone: "action",
      acts: edita ? [{ l: "Cambiar", v: "secondary", icon: "edit", onClick: () => { setRegla({ key: x.key, v: String(x.v), on: x.on }); setConf({ titulo: x.label.es, sub: "Cuenta desde ahora; lo ya ganado no cambia.", cta: "Guardar",
        plantillas: ["Ajuste por abuso", "Más peso a lo que ayuda"], hacer: (m) => { const y = rRef.current; return y ? gamRegla(y.key, y.v, y.on, m) : Promise.resolve({ ok: false, mensaje: "Escribe el valor." } as ResAdm); } }); } }] : undefined })) });
    B.push({ type: "group", k: "REGLAS" }, { type: "rows", items: REGLAS_PUNTOS(d.tope).map((r) => ({ key: r.es, icon: "info", t: r.es })) });
    B.push({ type: "note", tone: "info", t: "Quitar un voto, ocultar por las reglas o borrar resta lo que dio (asiento inverso). Entre cuentas que usaron el mismo dispositivo no hay puntos. La cuenta oficial no gana puntos." });
  }
  if (tab === "tabla") {
    const t = d.tabla, m = t.mes === "anterior" ? t.anterior : t.actual, mesN = nombreMes(m, true), ciudadN = d.ciudades.find((c) => c.id === d.ciudad)?.name ?? d.ciudad;
    const abierta = !t.cerrada, puedeCerrar = t.mes === "anterior" && abierta;
    if (d.ciudades.length > 1) B.push({ type: "chips", k: "CIUDAD", items: d.ciudades.map((c) => ({ l: c.name, v: c.id === d.ciudad ? "selected" : "filter", onClick: () => ir({ c: c.id }) })) });
    B.push({ type: "chips", k: `MES · ${ciudadN.toUpperCase()}`, items: (["actual", "anterior"] as const).map((k) => ({ l: nombreMes(k === "actual" ? t.actual : t.anterior, true), v: t.mes === k ? "selected" : "filter", onClick: () => ir({ m: k === "actual" ? null : "anterior" }) })) });
    if (t.cerrada) B.push({ type: "note", tone: "ok", icon: "check", t: `Mes cerrado el ${fecha(t.cerrada.at)}${t.cerrada.por ? ` por ${t.cerrada.por}` : " por el barrido del día 3"}. Premios entregados (insignia del mes; las monedas las acredita Mis monedas). Canjes de cupones del mes: ${t.cerrada.canjes} (los cupones llegan con el bloque 5g).` });
    else if (t.mes === "actual") B.push({ type: "note", tone: "info", icon: "calendar", t: `${mesN.charAt(0).toUpperCase()}${mesN.slice(1)} se congela el último día a medianoche de ${ciudadN}; luego hay 72 h para excluir y el día 3 se cierra solo si nadie lo cierra.` });
    else B.push({ type: "note", tone: "warn", icon: "calendar", t: `${mesN.charAt(0).toUpperCase()}${mesN.slice(1)} está congelado: excluye a quien hizo trampa y ciérralo. Si nadie lo cierra, el barrido lo cierra el día 3.`,
      cta: admin ? "Cerrar el mes" : undefined, onCta: admin ? () => setConf({ titulo: `Cerrar ${mesN} · ${ciudadN}`, sub: "1 · la tabla queda fija · 2 · los excluidos no reciben premio · 3 · se avisa a los 3 primeros (y quienes ya son Comandante toman las plazas de General del Barrio) · 4 · el reporte de canjes de cupones del mes. No se puede deshacer.",
        peligro: true, cta: "Cerrar el mes", plantillas: ["Revisión de fraude terminada", "Cierre del mes"], hacer: (mm) => gamCerrarMes(d.ciudad, m, mm) }) : undefined });
    let pos = 0;
    B.push(t.filas.length ? { type: "rows", items: t.filas.map((x) => {
      const p = x.excluido ? null : t.cerrada ? x.pos : ++pos;
      return { key: x.id, icon: "users", t: `${x.excluido ? "— " : `${p} · `}${x.nombre}`, s: `${x.recs} por recomendar · ${x.resp} por responder${x.excluido && x.motivo ? ` · Excluido: ${x.motivo}` : ""}`, r: String(x.puntos), dim: x.excluido,
        tag: x.excluido ? "EXCLUIDO" : x.general ? "GENERAL DEL BARRIO" : p && p <= 3 ? "PREMIO" : undefined, tone: x.excluido ? "danger" : "signal",
        acts: edita && abierta ? [{ l: x.excluido ? "Volver a incluir" : "Excluir", v: "secondary", icon: x.excluido ? "check" : "ban", onClick: () => setConf({ titulo: "", sub: x.excluido ? `¿Por qué vuelve ${x.nombre} a la tabla de ${mesN}?` : `Excluir a ${x.nombre} de la tabla de ${mesN}: no sale y no recibe premio. Sus puntos y su rango siguen igual. Recibe el aviso con el motivo.`,
          peligro: !x.excluido, cta: x.excluido ? "Volver a incluir" : "Excluir", plantillas: x.excluido ? ["Revisamos y no hubo trampa"] : ["Votos desde cuentas del mismo dispositivo", "Anillo de votos", "Puntos por contenido que rompe las reglas"],
          hacer: (mm) => gamExcluir(d.ciudad, m, x.id, !x.excluido, mm) }) }] : undefined };
    }) } : { type: "empty", icon: "users", t: "Nadie en la tabla", s: "Todavía nadie suma puntos este mes en esta ciudad." });
    B.push({ type: "note", tone: "info", t: "Excluidos no salen en la Comunidad. La cuenta oficial no gana puntos ni sale aquí. Premio: los 3 primeros reciben la insignia «Top del mes» (y 200 monedas cuando exista Mis monedas)." });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
