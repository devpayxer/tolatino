"use client";
/* ADM-PLAN · Planes y suscripciones (Super Admin.dc.html secPlan): MRR, en prueba, cobro fallido y Free al techo; Planes
   (Free y Pro), Suscripciones (filtros por estado; extender prueba, cortesía, quitar cortesía, reintentar cobro) y
   Comisiones (vigentes y programadas con 30 días). «Ingresos» del diseño llega con Analítica de dinero (LAUNCH-CHECKLIST). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosPlanes, TabPlan } from "@/lib/admin-planes";
import { comisionProgramar, planCortesia, planExtender, planQuitarCortesia, planReintentar } from "./acciones-planes";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST: Record<string, [string, string, string]> = { trial: ["EN PRUEBA", "action", "En prueba"], active: ["PRO", "signal", "Pro"], canceling: ["PASA A FREE", "neutral", "Pasa a Free"], past_due: ["COBRO FALLIDO", "danger", "Cobro fallido"], courtesy: ["CORTESÍA", "action", "Cortesía"], ended: ["FREE", "neutral", "Free"] };
const KIND: Record<string, string> = { ped: "Pedidos (Comida, Mercados, Tiendas)", cita: "Citas y solicitudes", bol: "Boletos", apt: "Apartados", rsv: "Reservaciones de mesa" };
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "") : "—");

export function Planes({ d, tab, est, editar, aprobar }: { d: DatosPlanes; tab: TabPlan; est: string | null; editar: boolean; aprobar: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const ir = (t: string, e?: string) => router.push(t === "res" && !e ? "/admin/planes" : `/admin/planes?tab=${t}${e ? `&est=${e}` : ""}`);
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: "PLANES Y SUSCRIPCIONES", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "DINERO Y CRECIMIENTO", t: "Planes y suscripciones", s: "Free y Pro: qué incluye cada uno, la prueba, el precio, los cobros fallidos y las comisiones.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "MRR", v: money(k.mrr), s: `${k.activos + k.anuales} Pro activos${k.anuales ? ` · ${k.anuales} anuales` : ""}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "EN PRUEBA", v: String(k.prueba), s: k.prueba7 ? `${k.prueba7} terminan en 7 días` : "ninguna termina esta semana", onClick: () => ir("subs", "trial") },
      { k: "COBRO FALLIDO", v: String(k.fallidos), s: "3 intentos en 7 días", onClick: () => ir("subs", "past_due") },
      { k: "FREE AL TECHO", v: String(k.techo), s: `${d.cfg.tope} en línea este mes · solo Llamar` },
    ] },
    { type: "tabs", items: ([["res", "Planes"], ["subs", "Suscripciones"], ["fees", "Comisiones"]] as const).map(([t, l]) => ({ l, on: tab === t, onClick: () => ir(t) })) },
  ];
  if (tab === "res") {
    B.push({ type: "group", k: "FREE" }, { type: "kv", items: [{ k: "TECHO MENSUAL EN LÍNEA", v: `${d.cfg.tope} pedidos o citas · después, Llamar` }, { k: "PÁGINA", v: "Una sola página, pocas fotos y 5 ítems; reseñas sin respuesta" }] });
    B.push({ type: "group", k: "PRO" }, { type: "kv", items: [{ k: "PRECIO", v: `${money(d.cfg.precio)} al mes · anual = 10 meses` }, { k: "PRUEBA", v: `${d.cfg.prueba} días sin tarjeta · HZL30 = 60` }, { k: "COBRO FALLIDO", v: "3 intentos en 7 días con aviso; al tercero, Free (nada se borra)" }, { k: "CORTESÍA", v: `${k.cortesia} negocios` }] });
    B.push({ type: "note", tone: "ink", icon: "info", t: "El precio, la prueba y el techo de Free son decisión del fundador: se cambian con una actualización de To’Latino, con su OK. Extender una prueba o dar cortesía se hace por negocio en Suscripciones." });
  }
  if (tab === "subs") {
    B.push({ type: "chips", items: [["", "Todas"], ["trial", "En prueba"], ["past_due", "Cobro fallido"], ["active", "Pro"], ["canceling", "Pasa a Free"], ["courtesy", "Cortesía"], ["ended", "Free"]].map(([v, l]) => ({ l: l!, v: (est ?? "") === v ? "selected" : "filter", onClick: () => ir("subs", v || undefined) })) });
  }
  const filas = tab === "subs" ? d.subs : [];
  const acciones = (x: DatosPlanes["subs"][number]) => [
    { label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.negocio}`) },
    ...(editar && x.estado === "trial" ? [{ label: "Extender prueba", variant: "secondary", onClick: () => setConf({ titulo: `Extender la prueba · ${x.nombre}`, cta: "Extender", sub: "El dueño lo ve en Tu plan. Entre 1 y 60 días.", valor: { k: "DÍAS", ini: "7", max: 2 }, plantillas: ["Se le pasó la prueba sin usarla.", "Problema técnico de To’Latino.", "Evento de la ciudad."], hacer: (m, _e, v) => planExtender(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado !== "courtesy" ? [{ label: "Cortesía", variant: "secondary", onClick: () => setConf({ titulo: `Pro de cortesía · ${x.nombre}`, cta: "Dar cortesía", sub: "Pro sin cobro por N días; después vuelve a Free y su contenido Pro se guarda.", valor: { k: "DÍAS", ini: "30", max: 3 }, plantillas: ["Socio fundador.", "Compensación por un problema.", "Negocio de la comunidad."], hacer: (m, _e, v) => planCortesia(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado === "courtesy" ? [{ label: "Quitar cortesía", variant: "secondary", onClick: () => setConf({ titulo: `Quitar cortesía · ${x.nombre}`, cta: "Quitar", peligro: true, sub: "Pasa a Free hoy; nada se borra.", hacer: (m) => planQuitarCortesia(x.negocio, m) }) }] : []),
    ...(editar && x.estado === "past_due" ? [{ label: "Reintentar cobro", variant: "secondary", onClick: () => setConf({ titulo: `Reintentar el cobro · ${x.nombre}`, cta: "Reintentar", sub: "Se cobra ya con la tarjeta guardada del dueño.", plantillas: ["El dueño cambió su tarjeta.", "El banco ya lo autorizó."], hacer: (m) => planReintentar(x.negocio, m) }) }] : []),
  ];
  if (tab === "fees") {
    B.push({ type: "note", tone: "info", icon: "info", t: "Comisión solo sobre lo cobrado con tarjeta en la app; el cargo de la tarjeta lo absorbe la comisión. Un cambio aplica en 30 días y los negocios reciben el aviso; lo ya vendido no cambia." });
    B.push({ type: "rows", items: d.fees.map((f) => ({ key: f.id, icon: "dollar", t: KIND[f.kind] ?? f.kind, s: f.vigente ? (f.reason ?? "Vigente") : `Programada desde el ${fecha(f.desde)} · ${f.reason ?? ""}`,
      r: `${f.rate_bp / 100} %${f.fixed_cents ? ` + ${money(f.fixed_cents)}` : ""}`, tag: f.vigente ? null : "PROGRAMADO", tone: "action", chev: false,
      acts: aprobar && f.vigente && f.kind !== "rsv" ? [{ l: "Programar cambio", v: "secondary", onClick: () => setConf({ titulo: `Nueva comisión · ${KIND[f.kind]}`, cta: "Programar", sub: `Ahora: ${f.rate_bp / 100} %. Aplica en 30 días; lo ya vendido no cambia.`, valor: { k: "PORCENTAJE (0 A 30)", ini: String(f.rate_bp / 100), max: 5 }, hacer: (m, _e, v) => comisionProgramar(f.kind, v, m) }) }] : undefined })) });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "subs" && (filas.length ? <A.AdminList rows={filas.map((x) => ({ icon: "wallet", title: x.nombre, sub: `${EST[x.estado]?.[2] ?? x.estado}${x.fin ? ` · ${x.estado === "trial" ? "termina" : x.estado === "past_due" ? "próximo intento" : x.estado === "ended" ? "desde" : x.estado === "courtesy" ? "hasta" : "próximo cobro"} ${fecha(x.fin)}` : ""}${x.intentos ? ` · intento ${x.intentos} de 3` : ""}${x.ciclo === "year" ? " · anual" : ""}${x.dueño ? ` · ${x.dueño}` : ""}`,
        tag: EST[x.estado]?.[0] ?? x.estado, tone: EST[x.estado]?.[1] ?? "neutral", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: "Nada con ese filtro", s: "Prueba otro estado." }]} />)}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
