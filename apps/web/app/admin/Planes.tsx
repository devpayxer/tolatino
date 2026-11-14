"use client";
/* ADM-PLAN · Planes y suscripciones (Super Admin.dc.html secPlan): MRR, en prueba, cobro fallido y Free al techo; Planes
   (Free y Pro), Suscripciones (filtros por estado; extender prueba, cortesía, quitar cortesía, reintentar cobro) y
   Comisiones (vigentes y programadas con 30 días) e Ingresos (comisiones y Pro de 8 semanas, por categoría, CSV). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosPlanes, Ingresos, TabPlan } from "@/lib/admin-planes";
import { comisionProgramar, ingresosCsv, planCortesia, planExtender, planQuitarCortesia, planReintentar } from "./acciones-planes";
import { alertaNota, conciliacionNota, conciliarOtraVez } from "./acciones-conciliacion";
import type { DiaConc, FilaDif } from "@/lib/conciliacion";
import type { FilaAlerta } from "@/lib/dinero-alertas";
/* 9k · Planes › Ingresos · Conciliación (el guardián del dinero) y las alertas del dinero. */
export type Conc = { dias: DiaConc[]; dia: string | null; difs: { filas: FilaDif[]; sigue: string | null }; alertas: { filas: FilaAlerta[]; sigue: string | null }; todas: boolean } | null;
const KIND_DIF: Record<string, string> = { payment_intent: "Cobro", refund: "Devolución", transfer: "Transferencia al organizador", transfer_reversal: "Reversión de transferencia", payout: "Pago al banco", dispute: "Disputa", hold_orphan: "Retención suelta" };
const PROB_DIF: Record<string, string> = { falta_en_libro: "está en Stripe y no en nuestro libro", falta_en_stripe: "está en nuestro libro y no en Stripe", monto: "el monto no coincide", estado: "el estado no coincide" };
const EST_DIA: Record<string, [string, string]> = { cuadra: ["CUADRA", "signal"], diferencias: ["DIFERENCIAS", "danger"], fallo: ["FALLÓ", "danger"], sin_correr: ["SIN CORRER", "neutral"] };
const ALERTA: Record<string, string> = { refund_stuck: "Devolución atascada", transfer_reversal_stuck: "Transferencia sin saldo para revertir", dispute_due: "Disputa por vencer", recon_diff: "El dinero no cuadra", recon_no_corrio: "La conciliación no corrió", payout_failed: "Pago al banco que falló" };
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "BarChart" | "HBars", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST: Record<string, [string, string, string]> = { trial: ["EN PRUEBA", "action", "En prueba"], active: ["PRO", "signal", "Pro"], canceling: ["PASA A FREE", "neutral", "Pasa a Free"], past_due: ["COBRO FALLIDO", "danger", "Cobro fallido"], courtesy: ["CORTESÍA", "action", "Cortesía"], ended: ["FREE", "neutral", "Free"] };
const KIND: Record<string, string> = { ped: "Pedidos de comida", merc: "Pedidos del mercado", cita: "Citas y solicitudes", bol: "Boletos", apt: "Apartados y layaway", rsv: "Reservaciones de mesa", plan: "Planes del hogar", renta: "Rentas", fiesta: "Depósitos de fiestas", viaje: "Viajes, envíos y mudanzas" };
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "") : "—");

export function Planes({ d, ing, conc = null, tab, est, editar, aprobar, exportar, dinero = false }: { d: DatosPlanes; ing?: Ingresos | null; conc?: Conc; tab: TabPlan; est: string | null; editar: boolean; aprobar: boolean; exportar?: boolean; dinero?: boolean }) {
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
  /* 9k · La conciliación diaria y las alertas del dinero (compuesto con las piezas del panel: group, rows, note, acts; hueco del diseño, REVISION 9k). */
  const usd = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
  const diaL = (ymd: string) => new Intl.DateTimeFormat("es-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
  const irIng = (q: Record<string, string>) => router.push(`/admin/planes?tab=ing&${new URLSearchParams(q)}`);
  const nota = (titulo: string, cta: string, plantillas: string[], hacer: (m: string) => Promise<ResAdm>, peligro = false) => setConf({ titulo, cta, peligro, sub: "La nota queda en la auditoría con tu nombre.", plantillas, hacer: (m) => hacer(m) });
  const conciliacion = (c: NonNullable<Conc>): Bloque[] => {
    const sel = c.dias.find((x) => x.dia === c.dia) ?? null;
    return [
      { type: "group", k: "CONCILIACIÓN DIARIA · STRIPE CONTRA NUESTRO LIBRO" },
      { type: "note", tone: "info", icon: "info", t: "Cada mañana se cuadra el día anterior, objeto por objeto: cobros, devoluciones, transferencias, pagos al banco, disputas y retenciones sueltas. Una diferencia sin dueño avisa al equipo y sale en Inicio." },
      { type: "rows", items: c.dias.map((x) => ({ key: x.dia, icon: x.estado === "cuadra" ? "check" : x.estado === "sin_correr" ? "clock" : "warning", t: diaL(x.dia),
        s: x.estado === "sin_correr" ? "todavía no corre" : x.estado === "fallo" ? "Stripe no respondió: vuelve a conciliarlo" : x.estado === "cuadra" ? `cuadra · ${x.stripeN} en Stripe, ${x.libroN} en el libro` : `${x.diferencias} diferencia${x.diferencias === 1 ? "" : "s"}${x.sinDueno ? ` · ${x.sinDueno} sin dueño` : " · todas con dueño"} · ${usd(x.diferenciaCents)}`,
        tag: EST_DIA[x.estado]![0], tone: EST_DIA[x.estado]![1], chev: true, onClick: () => irIng({ dia: x.dia }), compact: true, bd: x.dia === c.dia ? "1.5px solid var(--tl-ink)" : undefined })) },
      ...(c.dia ? [
        { type: "group" as const, k: `DIFERENCIAS DEL ${diaL(c.dia).toUpperCase()}${sel?.corrioAt ? ` · CORRIÓ ${new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(sel.corrioAt))}` : ""}` },
        ...(c.difs.filas.length ? [{ type: "rows" as const, items: c.difs.filas.map((f) => ({ key: f.id, icon: f.kind === "dispute" ? "law" : "dollar", t: `${KIND_DIF[f.kind] ?? f.kind}: ${PROB_DIF[f.problem] ?? f.problem}`,
          s: `${f.nombre ?? "To’Latino"} · ${f.stripeId ?? f.ledgerRef ?? ""} · Stripe ${f.stripeCents == null ? "—" : usd(f.stripeCents)}${f.stripeStatus ? ` (${f.stripeStatus})` : ""} · libro ${f.ledgerCents == null ? "—" : usd(f.ledgerCents)}${f.ledgerStatus ? ` (${f.ledgerStatus})` : ""}${f.dueno ? ` · ${f.dueno.accion === "resuelta" ? "resuelta por" : f.dueno.accion === "me_hago_cargo" ? "de" : "reabierta por"} ${f.dueno.quien}: ${f.dueno.nota}` : ""}`,
          tag: !f.dueno || f.dueno.accion === "reabierta" ? "SIN DUEÑO" : f.dueno.accion === "resuelta" ? "RESUELTA" : "CON DUEÑO", tone: !f.dueno || f.dueno.accion === "reabierta" ? "danger" : f.dueno.accion === "resuelta" ? "signal" : "action", chev: false,
          acts: dinero ? [
            ...(!f.dueno || f.dueno.accion === "reabierta" ? [{ l: "Me hago cargo", v: "secondary", onClick: () => nota("Me hago cargo de la diferencia", "Me hago cargo", ["La reviso hoy con Stripe.", "Es un cobro de prueba del sandbox.", "Lo veo con el negocio."], (m) => conciliacionNota(f.key, "me_hago_cargo", m)) }] : []),
            ...(f.dueno?.accion !== "resuelta" ? [{ l: "Resuelta", v: "secondary", onClick: () => nota("Cómo se resolvió", "Marcar resuelta", ["Stripe lo corrigió; el libro ya cuadra.", "Era un cruce de medianoche: cuadra al día siguiente.", "Se ajustó el libro con su caso."], (m) => conciliacionNota(f.key, "resuelta", m)) }] : []),
            ...(f.dueno && f.dueno.accion !== "reabierta" ? [{ l: "Reabrir", v: "secondary", onClick: () => nota("Por qué se reabre", "Reabrir", ["Volvió a salir al conciliar otra vez.", "La nota no era correcta."], (m) => conciliacionNota(f.key, "reabierta", m)) }] : []),
          ] : undefined })) }]
          : [{ type: "empty" as const, icon: "check", t: sel?.estado === "sin_correr" ? "Este día todavía no se concilió" : "Sin diferencias", s: sel?.estado === "fallo" ? "La corrida falló: vuelve a conciliarlo." : "Stripe y nuestro libro dicen lo mismo." }]),
        ...(c.difs.sigue ? [{ type: "acts" as const, items: [{ l: "Ver más", v: "secondary", onClick: () => irIng({ dia: c.dia!, antes: c.difs.sigue! }) }] }] : []),
        ...(dinero ? [{ type: "acts" as const, items: [{ l: "Conciliar otra vez", v: "secondary", onClick: () => nota(`Conciliar otra vez · ${diaL(c.dia!)}`, "Conciliar", ["Stripe ya corrigió el objeto.", "La corrida de la mañana falló."], (m) => conciliarOtraVez(c.dia!, m)) }] }] : []),
      ] : []),
      { type: "group", k: c.todas ? "ALERTAS DEL DINERO · TODAS" : "ALERTAS DEL DINERO · ABIERTAS", link: c.todas ? "Solo abiertas" : "Ver todas", onLink: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? {} : { alertas: "todas" }) }) },
      ...(c.alertas.filas.length ? [{ type: "rows" as const, items: c.alertas.filas.map((a) => ({ key: a.id, icon: a.kind === "dispute_due" ? "law" : "warning", t: `${ALERTA[a.kind] ?? a.kind}${a.monto ? ` · ${usd(a.monto)}` : ""}`,
        s: `${a.detalle.es}${a.nombre ? ` · ${a.nombre}` : ""}${a.nota ? ` · ${a.nota.quien}: ${a.nota.nota}` : ""}`, tag: a.estado === "abierta" ? "ABIERTA" : a.estado === "con_dueno" ? "CON DUEÑO" : "RESUELTA", tone: a.estado === "abierta" ? "danger" : a.estado === "con_dueno" ? "action" : "signal", chev: false,
        acts: dinero && a.estado !== "resuelta" ? [
          ...(a.estado === "abierta" ? [{ l: "Me hago cargo", v: "secondary", onClick: () => nota("Me hago cargo de la alerta", "Me hago cargo", ["La reviso hoy.", "Hablo con el negocio."], (m) => alertaNota(a.id, "me_hago_cargo", m)) }] : []),
          ...(a.aMano ? [{ l: "Resolver a mano", v: "secondary", onClick: () => nota(a.kind === "refund_stuck" ? "La devolución se hizo fuera de Stripe" : "Se le cobró al organizador fuera de Stripe", "Resolver a mano", a.kind === "refund_stuck" ? ["Se le mandó un cheque al cliente.", "Se le devolvió por transferencia bancaria; comprobante en el caso."] : ["El organizador pagó por transferencia; comprobante en el caso.", "Se descontó de su próxima liquidación fuera de Stripe."], (m) => alertaNota(a.id, "resuelta_a_mano", m), true) }] : []),
          { l: "Resuelta", v: "secondary", onClick: () => nota("Cómo se resolvió", "Marcar resuelta", ["Stripe ya lo hizo.", "Se respondió la disputa con evidencia.", "El banco del negocio ya recibió el pago."], (m) => alertaNota(a.id, "resuelta", m)) },
        ] : undefined })) }]
        : [{ type: "empty" as const, icon: "check", t: "Ninguna alerta abierta", s: "Devoluciones, transferencias, disputas y pagos al banco al día." }]),
      ...(c.alertas.sigue ? [{ type: "acts" as const, items: [{ l: "Ver más alertas", v: "secondary", onClick: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? { alertas: "todas" } : {}), aantes: c.alertas.sigue! }) }] }] : []),
    ];
  };
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "DINERO Y CRECIMIENTO", t: "Planes y suscripciones", s: "Free y Pro: qué incluye cada uno, la prueba, el precio, los cobros fallidos y las comisiones.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "MRR", v: money(k.mrr), s: `${k.activos + k.anuales} Pro activos${k.anuales ? ` · ${k.anuales} anuales` : ""}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "EN PRUEBA", v: String(k.prueba), s: k.prueba7 ? `${k.prueba7} terminan en 7 días` : "ninguna termina esta semana", onClick: () => ir("subs", "trial") },
      { k: "COBRO FALLIDO", v: String(k.fallidos), s: "3 intentos en 7 días", onClick: () => ir("subs", "past_due") },
      { k: "FREE AL TECHO", v: String(k.techo), s: `${d.cfg.tope} en línea este mes · solo Llamar` },
    ] },
    { type: "tabs", items: ([["res", "Planes"], ["subs", "Suscripciones"], ["fees", "Comisiones"], ["ing", "Ingresos"]] as const).map(([t, l]) => ({ l, on: tab === t, onClick: () => ir(t) })) },
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
      {tab === "ing" && ing ? (() => {
        // Ingresos (diseño «ing»): comisiones de 8 semanas (la actual resaltada), Pro de 8 semanas, comisión por categoría.
        const dia = (ymd: string) => new Intl.DateTimeFormat("es-US", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
        const tot = ing.semanas.reduce((a, w) => a + w.fee, 0), totPro = ing.semanas.reduce((a, w) => a + w.pro, 0), mx = Math.max(1, ...ing.categorias.map((k) => k.fee));
        const descargar = async () => { const r = await ingresosCsv(); if (!r.ok || !r.archivo) { setToast(r.ok ? "No se pudo." : r.mensaje); return; }
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`\ufeff${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-ingresos.csv"; document.body.appendChild(a); a.click(); a.remove(); setToast(r.mensaje ?? "Descargado."); };
        return (<>
          <A.BarChart label="COMISIONES · 8 SEMANAS" value={money(tot)} note={`Más Pro: ${money(totPro)} cobrados en 8 semanas · MRR ${money(d.kpi.mrr)} al mes.`}
            bars={ing.semanas.map((w, i) => ({ value: w.fee, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-action)" : "rgba(75,55,245,.35)" }))} />
          <A.BarChart label="COBROS DE PRO · 8 SEMANAS" value={money(totPro)} bars={ing.semanas.map((w, i) => ({ value: w.pro, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-ink)" : "rgba(11,14,18,.3)" }))} />
          {ing.categorias.length ? <A.HBars label="COMISIÓN POR CATEGORÍA · 90 DÍAS" items={ing.categorias.map((k) => ({ label: k.cat, width: `${Math.round((k.fee / mx) * 100)}%`, value: money(k.fee), color: "var(--tl-ink)" }))} />
            : <PanelBloques bloques={[{ type: "empty", icon: "dollar", t: "Sin comisiones en 90 días", s: "Aparecen cuando los negocios cobran con tarjeta." }]} />}
          <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: "Comisión = lo que To’Latino se queda de cada cobro con tarjeta, neto de devoluciones. Pro = cobros de suscripción. Los pagos a los negocios salen cada martes por Stripe." },
            ...(exportar ? [{ type: "acts" as const, items: [{ l: "Exportar CSV", v: "secondary", icon: "folder", onClick: () => { void descargar(); } }] }] : [])]} />
          {conc ? <PanelBloques bloques={conciliacion(conc)} h1={desk ? 26 : 22} /> : null}
        </>);
      })() : null}
      {tab === "subs" && (filas.length ? <A.AdminList rows={filas.map((x) => ({ icon: "wallet", title: x.nombre, sub: `${EST[x.estado]?.[2] ?? x.estado}${x.fin ? ` · ${x.estado === "trial" ? "termina" : x.estado === "past_due" ? "próximo intento" : x.estado === "ended" ? "desde" : x.estado === "courtesy" ? "hasta" : "próximo cobro"} ${fecha(x.fin)}` : ""}${x.intentos ? ` · intento ${x.intentos} de 3` : ""}${x.ciclo === "year" ? " · anual" : ""}${x.dueño ? ` · ${x.dueño}` : ""}`,
        tag: EST[x.estado]?.[0] ?? x.estado, tone: EST[x.estado]?.[1] ?? "neutral", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: "Nada con ese filtro", s: "Prueba otro estado." }]} />)}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
