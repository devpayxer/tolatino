"use client";
/* ADM-NEG · 360° › Dinero (Super Admin.dc.html, pestaña «din»): cifras de 90 días, Stripe (cuenta, banco, pagos semanales
   y pausar pagos), plan y facturas (cortesía 30/60/90, extender prueba 7/14/30, reintentar, anular) y los últimos cobros con
   tarjeta. Cada acción pide motivo y queda en la auditoría; el servidor revisa el permiso otra vez. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Dinero } from "@/lib/admin-dinero";
import { pagosPausar } from "./acciones-dinero";
import { planAnular, planCortesia, planExtender, planQuitarCortesia, planReintentar } from "./acciones-planes";
import type { Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "—");
const dia = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
const CUENTA: Record<string, [string, string]> = { enabled: ["Habilitada · recibe pagos", "var(--tl-open-text)"], pending: ["Falta verificar la identidad", "var(--tl-pro-ink)"], restricted: ["Restringida por Stripe", "var(--tl-pro-ink)"] };
const SUB: Record<string, string> = { trial: "En prueba", active: "Activa", canceling: "Pasa a Free al final del período", past_due: "Cobro fallido", courtesy: "Pro de cortesía", ended: "Free · el contenido Pro está guardado" };
const FAC: Record<string, [string, string, string]> = { charged: ["Cobro de Pro", "PAGADA", "signal"], failed: ["Cobro fallido", "FALLÓ", "danger"], trial_extended: ["Prueba extendida", "EQUIPO", "neutral"], courtesy: ["Pro de cortesía", "EQUIPO", "action"], courtesy_removed: ["Cortesía quitada", "EQUIPO", "neutral"], ended: ["Pasó a Free", "FREE", "neutral"] };
const PAGO: Record<string, [string, string]> = { held: ["RETENIDO", "action"], captured: ["COBRADO", "signal"], released: ["LIBERADO", "neutral"], refunded: ["DEVUELTO", "neutral"], partially_refunded: ["DEVOLUCIÓN PARCIAL", "action"], failed: ["FALLÓ", "danger"] };
const DISP: Record<string, string> = { needs_response: "DISPUTA · FALTA RESPONDER", under_review: "DISPUTA · EL BANCO REVISA", won: "DISPUTA GANADA", lost: "DISPUTA PERDIDA", accepted: "DISPUTA ACEPTADA" };
const POR = ["Disputa abierta con el banco", "Sospecha de fraude", "Muchas devoluciones seguidas", "Pedido del dueño"];
const D = (n: number) => ({ k: String(n), l: `${n} días` });

export function N360Dinero({ d, id, nombre, desk, setConf }: { d: Dinero; id: string; nombre: string; desk: boolean; setConf: (c: Confirmar) => void }) {
  const router = useRouter(), c = d.cuenta, s = d.sub, P = d.puede, k = d.kpi;
  const B: Bloque[] = [
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "COBRADO · 90 D", v: money(k.cobrado), s: `${k.n} ${k.n === 1 ? "cobro" : "cobros"} con tarjeta` },
      { k: "RETENIDO AHORA", v: money(k.retenido), s: "esperando que el negocio acepte" },
      { k: "DEVUELTO", v: money(k.devuelto), s: "90 días" },
      { k: "COMISIÓN TO’LATINO", v: money(k.comision), s: "sobre lo cobrado", bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    ] },
    { type: "group", k: "STRIPE" },
    { type: "kv", cols: desk ? 3 : 1, items: [
      { k: "CUENTA", v: c ? CUENTA[c.estado]?.[0] ?? c.estado : "Sin conectar · no cobra en línea", fg: c ? CUENTA[c.estado]?.[1] : undefined },
      { k: "BANCO", v: c?.banco ? `Termina en ${c.banco}` : "—" },
      { k: "PAGOS", v: !c ? "—" : c.pausado ? "En pausa por To’Latino" : "Cada semana · los martes", fg: c?.pausado ? "var(--tl-pro-ink)" : undefined },
    ] },
  ];
  if (c?.pausado) B.push({ type: "note", tone: "danger", icon: "lock", t: `Pagos en pausa desde el ${fecha(c.desde)}${c.quien ? ` por ${c.quien}` : ""}: ${c.motivo ?? "sin motivo"}. Se sigue cobrando; nada sale al banco hasta reanudar. El dueño lo ve en Cobros.` });
  if (c && c.pide.length) B.push({ type: "note", tone: "warn", icon: "info", t: `Stripe todavía pide ${c.pide.length} ${c.pide.length === 1 ? "dato" : "datos"} al dueño. Mientras falten, los pagos al banco pueden detenerse.` });
  if (d.modo !== "stripe" || c?.sim) B.push({ type: "note", tone: "info", icon: "info", t: "Sandbox: los cobros van contra el simulador y no se mueve dinero real. Los pagos al banco se calculan de lo cobrado." });
  const L: Bloque[] = [];
  if (c && P.pausar && (c.estado === "enabled" || c.pausado)) L.push({ type: "acts", items: [c.pausado
    ? { l: "Reanudar pagos", v: "action", icon: "check", onClick: () => setConf({ titulo: `Reanudar los pagos de ${nombre}`, cta: "Reanudar", sub: "Lo pendiente sale el próximo martes. El dueño recibe el aviso.", plantillas: ["Se resolvió la disputa.", "Se confirmó que no hubo fraude."], hacer: (m) => pagosPausar(id, false, m) }) }
    : { l: "Pausar pagos", v: "danger", icon: "lock", onClick: () => setConf({ titulo: `Pausar los pagos de ${nombre}`, cta: "Pausar", peligro: true, sub: "El dinero sigue cobrándose pero no sale al banco hasta que lo reanudes. Úsalo con disputas o sospecha de fraude. El dueño recibe el aviso.", plantillas: POR, hacer: (m) => pagosPausar(id, true, m) }) }] });

  const pagos: Bloque = d.pagos.length
    ? { type: "rows", items: d.pagos.map((p) => ({ key: p.martes, icon: "dollar", t: `${money(p.monto)} al banco`, s: `${dia(p.martes)} · ${p.n} ${p.n === 1 ? "cobro" : "cobros"}${c?.banco ? ` · ·· ${c.banco}` : ""}`,
        tag: p.st === "hold" ? "EN PAUSA" : p.st === "next" ? "PRÓXIMO" : "ENVIADO", tone: p.st === "hold" ? "danger" : p.st === "next" ? "action" : "signal", chev: false })) }
    : { type: "note", tone: "info", icon: "dollar", t: c ? "Sin pagos al banco en las últimas 6 semanas." : "Sin cuenta de cobro: el negocio cobra solo en el local." };

  const plan: Bloque[] = [{ type: "group", k: "PLAN Y FACTURAS", link: "Ver en Planes", onLink: () => router.push("/admin/planes?tab=subs") }];
  plan.push({ type: "kv", cols: desk ? 2 : 1, items: [
    { k: "PLAN", v: !s ? "Free" : s.estado === "courtesy" ? `Pro de cortesía · hasta el ${fecha(s.fin)}` : s.estado === "ended" ? "Free" : `Pro · ${money(s.precio * (s.ciclo === "year" ? 10 : 1))}${s.ciclo === "year" ? " al año" : " al mes"}` },
    { k: "ESTADO", v: !s ? "Sin plan" : s.estado === "past_due" ? `Cobro fallido · intento ${s.intentos} de 3` : s.estado === "trial" ? `En prueba · termina el ${fecha(s.fin)}` : SUB[s.estado] ?? s.estado, fg: s?.estado === "past_due" ? "var(--tl-pro-ink)" : undefined },
    ...(s && ["active", "past_due"].includes(s.estado) ? [{ k: s.estado === "past_due" ? "PRÓXIMO INTENTO" : "PRÓXIMO COBRO", v: fecha(s.fin) }] : []),
    ...(s ? [{ k: "CLIENTE DESDE", v: fecha(s.desde) }] : []),
  ] });
  if (d.facturas.length) plan.push({ type: "rows", items: d.facturas.map((f) => ({ key: f.id, icon: f.kind === "charged" || f.kind === "failed" ? "card" : "clock",
    t: `${FAC[f.kind]?.[0] ?? f.kind}${f.monto ? ` · ${money(f.monto)}` : ""}`, s: `${fecha(f.at)}${f.intento ? ` · intento ${f.intento} de 3` : ""}${f.actor ? ` · ${f.actor}` : ""}`,
    tag: FAC[f.kind]?.[1], tone: FAC[f.kind]?.[2] ?? "neutral", chev: false })) });
  else plan.push({ type: "note", tone: "info", icon: "card", t: "Sin cobros de Pro todavía." });
  const pa: { l: string; v?: string; icon: string; onClick: () => void }[] = [];
  if (P.planA && s?.estado !== "courtesy" && !(s && ["active", "canceling"].includes(s.estado))) pa.push({ l: "Pro de cortesía", icon: "dollar", onClick: () => setConf({ titulo: `Pro de cortesía para ${nombre}`, cta: "Dar cortesía", sub: "Pro sin cobro por el tiempo que elijas; después vuelve a Free y su contenido Pro se guarda.", elegir: { label: "POR CUÁNTO", items: [D(30), D(60), D(90)] }, plantillas: ["Socio fundador.", "Compensación por un problema.", "Negocio de la comunidad."], hacer: (m, e) => planCortesia(id, e ?? "30", m) }) });
  if (P.planA && s?.estado === "courtesy") pa.push({ l: "Quitar cortesía", icon: "close", onClick: () => setConf({ titulo: `Quitar la cortesía de ${nombre}`, cta: "Quitar", peligro: true, sub: "Pasa a Free hoy; nada se borra.", hacer: (m) => planQuitarCortesia(id, m) }) });
  if (P.planE && s?.estado === "trial") pa.push({ l: "Extender prueba", icon: "clock", onClick: () => setConf({ titulo: `Extender la prueba de ${nombre}`, cta: "Extender", sub: "El dueño lo ve en Tu plan.", elegir: { label: "CUÁNTO MÁS", items: [D(7), D(14), D(30)] }, plantillas: ["Se le pasó la prueba sin usarla.", "Problema técnico de To’Latino.", "Evento de la ciudad."], hacer: (m, e) => planExtender(id, e ?? "7", m) }) });
  if (P.planE && s?.estado === "past_due") pa.push({ l: "Reintentar cobro", v: "action", icon: "card", onClick: () => setConf({ titulo: `Reintentar el cobro de ${nombre}`, cta: "Reintentar", sub: "Se cobra ya con la tarjeta guardada del dueño.", plantillas: ["El dueño cambió su tarjeta.", "El banco ya lo autorizó."], hacer: (m) => planReintentar(id, m) }) });
  if (P.planA && s && ["active", "trial", "past_due"].includes(s.estado)) pa.push({ l: "Anular suscripción", v: "danger", icon: "ban", onClick: () => setConf({ titulo: `Anular la suscripción de ${nombre}`, cta: "Anular", peligro: true,
    sub: s.estado === "past_due" ? "Pasa a Free hoy (este período no se pagó). Nada se borra." : s.estado === "trial" ? "El último día de la prueba pasa a Free. Nada se borra." : "Sigue en Pro hasta el final del período y luego baja a Free. No se devuelve lo cobrado.", hacer: (m) => planAnular(id, m) }) });
  if (pa.length) plan.push({ type: "acts", items: pa });

  const cobros: Bloque[] = [{ type: "group", k: "COBROS CON TARJETA", link: d.cobros.length ? "Ver en Transacciones" : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) }];
  return (
    <>
      <PanelBloques bloques={[...B, pagos, ...L, ...plan, ...cobros]} />
      {d.cobros.length ? <A.AdminList rows={d.cobros.map((x) => ({ icon: "card", title: `${x.num} · ${money(x.monto)}`, sub: `${x.quien} · ${dia(x.at)}${x.tarjeta ? ` · ${x.tarjeta}` : ""} · comisión ${money(x.comision)}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}`,
        tag: x.disputa ? DISP[x.disputa] ?? "DISPUTA" : PAGO[x.estado]?.[0] ?? x.estado, tone: x.disputa ? (x.disputa === "won" ? "signal" : "danger") : PAGO[x.estado]?.[1] ?? "neutral" }))} />
        : <A.AdminNote tone="info" icon="card">Sin cobros con tarjeta todavía.</A.AdminNote>}
    </>
  );
}
