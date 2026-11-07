"use client";
/* 5f–5g · ADM-GAM · Gamification (Super Admin.dc.html secGam): Rangos (los 10 con lo que piden y desbloquean, cuántos vecinos hay en cada uno,
   «Cambiar nombre» ES/EN con vista previa), Puntos (tope del día 50 · 100 · 150 · 200 y cada regla con su valor y su interruptor; las 4
   reglas fijas) y Tabla del Barrio (ciudad, mes en curso o anterior, excluir con motivo, «Cerrar el mes» con sus 4 pasos, solo Admin).
   Cada cambio pide motivo y queda en la auditoría; la Comunidad lo lee al instante. Solo bloques del sistema; el servidor decide.
   5g: Monedas (EN CIRCULACIÓN · EMITIDAS ESTE MES · CANJEADAS · VALOR «Sin valor en dinero»; reglas de ganancia con valor e interruptor;
   últimos movimientos; el ajuste ± va en Usuarios 360°) y Cupones (por ciudad y estado: aprobar con costo 80–1,000, rechazar, cambiar
   costo, pausar con motivo y aviso al negocio, activar; los últimos canjes). El Patio, después de la apertura (G); «Rango del negocio» no
   se construye (§6 #23). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Gam } from "@/lib/admin-gam";
import { CUANDO_PATIO, REGLAS_PUNTOS, nombreMes } from "@/lib/puntos-comun";
import type { ResAdm } from "./acciones-colas";
import { gamCerrarMes, gamCuponActivar, gamCuponAprobar, gamCuponCosto, gamCuponPausar, gamCuponRechazar, gamExcluir, gamMonedaRegla, gamRegla, gamRenombrar, gamTope } from "./acciones-gam";
import { COSTO_MAX, COSTO_MIN, SIN_VALOR } from "@/lib/monedas-comun";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

type Tab = "rk" | "pts" | "coin" | "cup" | "tabla";
const fecha = (d: string) => new Date(d).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });

export function Gamificacion({ d, tab, edita, admin }: { d: Gam; tab: Tab; edita: boolean; admin: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), desk = useAncho() >= 1024, cols = desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [nombre, setNombre] = useState<{ n: number; es: string; en: string } | null>(null);
  const [regla, setRegla] = useState<{ key: string; v: string; on: boolean; mon?: boolean } | null>(null);
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
        { type: "field", k: regla.mon ? "MONEDAS · 0–1,000" : "PUNTOS · 0–100", val: regla.v, im: "numeric", max: 4, onChange: (v: string) => setRegla((x) => (x ? { ...x, v: v.replace(/[^\d]/g, "").slice(0, x.mon ? 4 : 3) } : x)) },
        { type: "rows", items: [{ key: "on", icon: "star", t: regla.on ? "Encendida" : "Apagada", s: "Apagada no da puntos desde ahora; lo ya ganado no cambia.", tgOn: regla.on, onTg: () => setRegla((x) => (x ? { ...x, on: !x.on } : x)) }] },
      ]} />}
      <ConfirmarMotivo c={{ ...conf, titulo: "¿Por qué?" }} desk={desk} onBack={cerrarConf} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const B: Bloque[] = [
    { type: "head", eye: "DINERO Y CRECIMIENTO", t: "Gamification", s: "Rangos, puntos, monedas, cupones y la Tabla del Barrio. Lo que cambies aquí lo ve la Comunidad al instante. Aquí nada se compra: los puntos salen de los votos de los vecinos y las monedas no tienen valor en dinero.", h1: desk ? 26 : 22 },
    { type: "tabs", items: ([["rk", "Rangos", "10"], ["pts", "Puntos"], ["coin", "Monedas"], ["cup", "Cupones", d.cupones?.conteo.pending ? String(d.cupones.conteo.pending) : undefined], ["tabla", "Tabla del Barrio"]] as [Tab, string, string?][]).map(([k, l, n]) => ({ l, n, on: tab === k, onClick: () => ir({ tab: k === "rk" ? null : k, e: null, cur: null }) })) },
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
  if (tab === "coin" && d.monedas) {
    const M = d.monedas, n = (x: number) => x.toLocaleString("en-US");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "EN CIRCULACIÓN", v: n(M.circulacion), s: "monedas en saldos", bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: "EMITIDAS ESTE MES", v: n(M.emitidas), s: "bienvenida, premios y ajustes" },
      { k: "CANJEADAS", v: n(M.canjeadas.monedas), s: `${n(M.canjeadas.codigos)} códigos este mes · ${n(M.devueltas)} devueltas` }, { k: "VALOR", v: SIN_VALOR.es, s: "no se compran ni se cambian" }] });
    B.push({ type: "note", tone: "info", icon: "ticket", t: "Las monedas se ganan, nunca se compran. Aquí no se juega dinero. No se venden, no se pasan a otra persona, no se cambian por dinero y no vencen. Las «monedas diarias» llegan con El Patio (después de la apertura)." });
    B.push({ type: "group", k: "CÓMO SE GANAN" }, { type: "rows", items: M.reglas.map((x) => ({ key: x.key, icon: "ticket", t: x.label.es, s: x.on ? "Encendida" : "Apagada: no da monedas", r: x.on ? `+${x.v}` : "—", dim: !x.on, tag: x.editado ? "EDITADO" : undefined, tone: "action",
      acts: edita ? [{ l: "Cambiar", v: "secondary", icon: "edit", onClick: () => { setRegla({ key: x.key, v: String(x.v), on: x.on, mon: true }); setConf({ titulo: x.label.es, sub: "Cuenta desde ahora; lo ya acreditado no cambia.", cta: "Guardar",
        plantillas: ["Lo pidió el fundador", "Ajuste del premio del mes"], hacer: (m) => { const y = rRef.current; return y ? gamMonedaRegla(y.key, y.v, y.on, m) : Promise.resolve({ ok: false, mensaje: "Escribe el valor." } as ResAdm); } }); } }] : undefined })) });
    B.push({ type: "rows", items: [{ key: "cupon", icon: "ticket", t: "Cupón de un negocio", s: "Lo que fija To'Latino al aprobarlo (80–1,000)", r: "según el cupón" }] });
    B.push({ type: "group", k: "ÚLTIMOS MOVIMIENTOS", link: "Ajustar el saldo de un vecino", onLink: () => router.push("/admin/usuarios") });
    const MOT: Record<string, string> = { welcome: "Bienvenida", premio_mes: "Premio de la Tabla del Barrio", canje: "Canjeó un cupón", devolucion: "Código vencido: monedas devueltas", ajuste: "Ajuste del equipo" };
    B.push(M.log.length ? { type: "rows", items: M.log.map((x) => ({ key: x.id, icon: "ticket", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? "var(--tl-danger)" : undefined,
      t: `${x.persona} · ${MOT[x.motivo] ?? "Monedas"}${x.motivo === "ajuste" && x.razon ? `: ${x.razon}` : ""}`, s: `${x.quien ? `Equipo · ${x.quien} · ` : ""}${fecha(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}`,
      onClick: () => router.push(`/admin/usuarios/${x.uid}?tab=comunidad`) })) } : { type: "empty", icon: "ticket", t: "Sin movimientos", s: "Todavía nadie tiene monedas en tus ciudades." });
    B.push({ type: "note", tone: "info", t: "El ajuste ± de un vecino (con motivo y tope por rol) está en Usuarios › 360° › Comunidad › Monedas. Nunca deja el saldo en negativo. Nadie se ajusta a sí mismo." });
  }
  if (tab === "cup" && d.cupones) {
    const C = d.cupones, ciudadN = d.ciudades.find((c) => c.id === d.ciudad)?.name ?? d.ciudad;
    const ESTL: Record<string, [string, string]> = { pending: ["Por aprobar", "POR APROBAR"], live: ["En la Comunidad", "EN LA COMUNIDAD"], paused: ["Pausados", "PAUSADO"], ended: ["Terminados", "TERMINADO"] };
    if (d.ciudades.length > 1) B.push({ type: "chips", k: "CIUDAD", items: d.ciudades.map((c) => ({ l: c.name, v: c.id === d.ciudad ? "selected" : "filter", onClick: () => ir({ c: c.id, cur: null }) })) });
    B.push({ type: "chips", k: `CUPONES · ${ciudadN.toUpperCase()}`, items: (["pending", "live", "paused", "ended"] as const).map((k) => ({ l: `${ESTL[k]![0]} · ${C.conteo[k]}`, v: C.estado === k ? "selected" : "filter", onClick: () => ir({ e: k === "pending" ? null : k, cur: null }) })) });
    B.push({ type: "note", tone: "info", icon: "ticket", t: `El negocio (Pro) lo ofrece; To'Latino lo aprueba y fija el costo (${COSTO_MIN}–${COSTO_MAX.toLocaleString("en-US")} monedas). Pausar lo quita de la Comunidad al instante; los códigos ya canjeados siguen valiendo. «Liquidar» al cierre del mes es un reporte de canjes: To'Latino no le paga ni le cobra nada al negocio.` });
    const conCosto = (titulo: string, sub: string, cta: string, hacer: (m: string, v: string) => Promise<ResAdm>, ini = "") => setConf({ titulo, sub, cta, valor: { k: `COSTO EN MONEDAS · ${COSTO_MIN}–${COSTO_MAX.toLocaleString("en-US")}`, ini, max: 4 }, plantillas: ["Revisado: oferta clara", "Costo según lo que vale la oferta"], hacer: (m, _e, v) => hacer(m, v) });
    B.push(C.filas.length ? { type: "rows", cols, items: C.filas.map((x) => {
      const acts: { l: string; v: string; icon: string; onClick: () => void }[] = [];
      if (edita && x.estado === "pending") acts.push({ l: "Aprobar", v: "primary", icon: "check", onClick: () => conCosto(`Aprobar «${x.titulo.es}»`, `${x.negocio} · ${x.cupo} al mes · vence ${x.dias} días después de canjearlo. El negocio recibe el aviso con el costo.`, "Aprobar", (m, v) => gamCuponAprobar(x.id, v, m)) },
        { l: "Rechazar", v: "secondary", icon: "ban", onClick: () => setConf({ titulo: `Rechazar «${x.titulo.es}»`, sub: "No sale. El negocio recibe el aviso con el motivo.", peligro: true, cta: "Rechazar", plantillas: ["La oferta no es clara", "Parece una venta, no un regalo o descuento", "Datos de contacto en el texto"], hacer: (m) => gamCuponRechazar(x.id, m) }) });
      if (edita && (x.estado === "live" || x.estado === "paused")) acts.push({ l: "Cambiar costo", v: "secondary", icon: "edit", onClick: () => conCosto(`Costo de «${x.titulo.es}»`, `Ahora: ${x.costo} monedas. Cuenta para los canjes de aquí en adelante.`, "Guardar", (m, v) => gamCuponCosto(x.id, v, m), String(x.costo ?? "")) });
      if (edita && (x.estado === "live" || (x.estado === "paused" && x.pausaPor === "business"))) acts.push({ l: "Pausar", v: "secondary", icon: "ban", onClick: () => setConf({ titulo: `Pausar «${x.titulo.es}»`, sub: "Sale de la Comunidad al instante. Los códigos ya canjeados siguen valiendo. El negocio recibe el aviso con el motivo.", peligro: true, cta: "Pausar",
        plantillas: ["Quejas de vecinos: no lo respetan en el local", "La oferta cambió", "Revisión de fraude"], hacer: (m) => gamCuponPausar(x.id, m) }) });
      if (edita && x.estado === "paused" && x.pausaPor === "admin") acts.push({ l: "Activar", v: "secondary", icon: "check", onClick: () => setConf({ titulo: `Activar «${x.titulo.es}»`, sub: "Vuelve a la Comunidad. El negocio recibe el aviso.", cta: "Activar", plantillas: ["Revisado con el negocio"], hacer: (m) => gamCuponActivar(x.id, m) }) });
      return { key: x.id, icon: "ticket", t: `${x.titulo.es} · ${x.negocio}`, s: `${x.condiciones.es ? `${x.condiciones.es} · ` : ""}${x.cupo} al mes · ${x.dias} días${x.motivo ? ` · ${x.pausaPor === "business" ? "Pausado por el negocio" : "Motivo"}: ${x.motivo}` : x.estado === "paused" && x.pausaPor === "business" ? " · Pausado por el negocio" : ""}`,
        m: x.estado === "pending" ? `ENVIADO EL ${fecha(x.creado).toUpperCase()}` : `${x.mes} DE ${x.cupo} ESTE MES · ${x.usados} USADOS · ${x.vivos} CÓDIGOS VIVOS`,
        r: x.costo != null ? String(x.costo) : "—", tag: ESTL[x.estado]![1], tone: x.estado === "live" ? "signal" : x.estado === "pending" ? "action" : x.estado === "paused" ? "danger" : "neutral", dim: x.estado === "ended", acts: acts.length ? acts : undefined };
    }) } : { type: "empty", icon: "ticket", t: "Nada aquí", s: C.estado === "pending" ? "Ningún cupón espera aprobación en esta ciudad." : "No hay cupones en este estado." });
    if (C.mas) B.push({ type: "acts", items: [{ l: "Ver más", v: "secondary", onClick: () => ir({ cur: C.mas }) }] });
    const CE: Record<string, [string, string]> = { issued: ["EMITIDO", "action"], used: ["USADO", "signal"], expired: ["VENCIÓ · DEVUELTO", "neutral"] };
    B.push({ type: "group", k: `ÚLTIMOS CANJES · ${ciudadN.toUpperCase()}` });
    B.push(C.canjes.length ? { type: "rows", items: C.canjes.map((x) => ({ key: x.id, icon: "ticket", t: `${x.codigo} · ${x.titulo.es}`, s: `${x.negocio} · ${x.persona} · ${fecha(x.at)}${x.usado ? ` · usado el ${fecha(x.usado)}` : ""}`, r: String(x.costo), tag: CE[x.estado]![0], tone: CE[x.estado]![1], compact: true })) }
      : { type: "empty", icon: "ticket", t: "Sin canjes", s: "Todavía nadie canjea cupones en esta ciudad." });
  }
  if (tab === "tabla") {
    const t = d.tabla, m = t.mes === "anterior" ? t.anterior : t.actual, mesN = nombreMes(m, true), ciudadN = d.ciudades.find((c) => c.id === d.ciudad)?.name ?? d.ciudad;
    const abierta = !t.cerrada, puedeCerrar = t.mes === "anterior" && abierta;
    if (d.ciudades.length > 1) B.push({ type: "chips", k: "CIUDAD", items: d.ciudades.map((c) => ({ l: c.name, v: c.id === d.ciudad ? "selected" : "filter", onClick: () => ir({ c: c.id }) })) });
    B.push({ type: "chips", k: `MES · ${ciudadN.toUpperCase()}`, items: (["actual", "anterior"] as const).map((k) => ({ l: nombreMes(k === "actual" ? t.actual : t.anterior, true), v: t.mes === k ? "selected" : "filter", onClick: () => ir({ m: k === "actual" ? null : "anterior" }) })) });
    if (t.cerrada) B.push({ type: "note", tone: "ok", icon: "check", t: `Mes cerrado el ${fecha(t.cerrada.at)}${t.cerrada.por ? ` por ${t.cerrada.por}` : " por el barrido del día 3"}. Premios entregados (insignia del mes y las monedas del premio, con el libro de monedas). Canjes de cupones del mes en la ciudad: ${t.cerrada.canjes} (reporte; no se le paga ni se le cobra nada al negocio).` });
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
    B.push({ type: "note", tone: "info", t: "Excluidos no salen en la Comunidad. La cuenta oficial no gana puntos ni sale aquí. Premio: los 3 primeros reciben la insignia «Top del mes» y las monedas de la regla «premio del mes» (Monedas), sin valor en dinero." });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
