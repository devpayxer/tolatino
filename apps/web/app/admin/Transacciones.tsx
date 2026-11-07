"use client";
/* ADM-TX · Transacciones (Super Admin.dc.html secTx / txRow): cifras (hoy, terminados 90 d, no se dieron, reservaciones),
   búsqueda por número, negocio o cliente, pestañas (Todas, Pedidos, Reservaciones), estados y exportar a CSV. Hoy todo se
   paga en el local: sin retenido, devoluciones ni comisión hasta Stripe (2d). Citas, boletos y apartados con sus fases. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import type { EstTx, FiltrosTx, ListaTx } from "@/lib/admin-tx";
import { devolverTx, disputaSimular, disputaSimularResultado, exportarTx } from "./acciones-tx";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon", ComponentType<any>>;
const ST: Record<EstTx, [string, string]> = { pend: ["PENDIENTE", "neutral"], curso: ["EN CURSO", "action"], done: ["TERMINADO", "signal"], cx: ["CANCELADO", "neutral"], no: ["NO SE DIO", "danger"] };
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

const DISP: Record<string, string> = { needs_response: "DISPUTA · FALTA RESPONDER", under_review: "DISPUTA · EL BANCO REVISA", won: "DISPUTA GANADA", lost: "DISPUTA PERDIDA", accepted: "DISPUTA ACEPTADA" };
/* Pedido del mercado: estimado · retenido · cobrado (peso real) · liberado, o «en el mercado» si no pasó por la app. */
const money2 = (c: number) => `$${(c / 100).toFixed(2)}`;
const E_M = (x: { mEst: number | null; mRet: number | null; pago: string | null; cob: number; total: number }) => x.mRet == null ? `estimado ${money2(x.mEst ?? x.total)} · paga en el mercado`
  : `estimado ${money2(x.mEst ?? 0)} · retenido ${money2(x.mRet)}${x.pago === "captured" || x.pago === "partially_refunded" || x.pago === "refunded" ? ` · cobrado ${money2(x.cob)} · liberado ${money2(x.mRet - x.cob)}` : x.pago === "released" ? " · liberado todo" : " · sin cobrar"}`;
// Lo que el Super Admin puede devolver desde aquí (acciones-tx.ts › devolverTx decide lo mismo en el servidor).
const DEVUELVE = new Set(["order", "appointment", "party", "trip", "night"]);
export function Transacciones({ d, f, porPagina, exportar, devolver, sim }: { d: ListaTx; f: FiltrosTx; porPagina: number; exportar: boolean; devolver: boolean; sim?: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [toast, setToast] = useToast(), [pend, start] = useTransition(), [conf, setConf] = useState<Confirmar | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const tg = (k: EstTx) => { const l = f.st.includes(k) ? f.st.filter((x) => x !== k) : [...f.st, k]; ir({ st: l.join(",") || null }); };
  const bajar = () => start(async () => {
    const r = await exportarTx(Object.fromEntries(sp.entries()));
    if (!r.ok || !r.archivo) { setToast(r.ok ? "No se pudo." : r.mensaje); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`﻿${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-transacciones.csv"; document.body.appendChild(a); a.click(); a.remove();
    setToast(r.mensaje ?? "Descargado.");
  });
  const k = d.kpi;
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: "TRANSACCIONES", t: "Devolver dinero", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const PG: Record<string, string> = { held: "RETENIDO", captured: "COBRADO", released: "LIBERADO", refunded: "DEVUELTO", partially_refunded: "DEVUELTO EN PARTE", failed: "FALLÓ" };
  const bloques: Bloque[] = [
    { type: "head", eye: `${d.total} EN 90 DÍAS`, t: "Transacciones", s: "Pedidos, reservaciones y citas de los últimos 90 días: en el local, al recibir o con tarjeta en la app (retenido, cobrado, liberado, devuelto). En citas, la tarjeta es el depósito y la comisión (8 %) va sobre el depósito.", h1: desk ? 26 : 22,
      act: exportar ? { l: pend ? "Exportando…" : "Exportar", icon: "folder", onClick: bajar } : undefined },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "HOY", v: String(k.hoy), s: `${money(k.hoyc)} en pedidos`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "PEDIDOS TERMINADOS 90 D", v: String(k.done), s: `${money(k.donec)} pagados en el local`, onClick: () => ir({ st: "done" }) },
      { k: "NO SE DIERON 90 D", v: String(k.perdidos), s: "cancelados, rechazados o sin respuesta", onClick: () => ir({ st: "cx,no" }) },
      { k: "RESERVACIONES 90 D", v: String(k.rsv), s: "mesas", onClick: () => ir({ tab: "rsv" }) },
    ] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "CITAS 90 D", v: String(k.cit), s: `${money(k.citd)} en depósitos`, onClick: () => ir({ tab: "cita" }) },
      { k: "PLANES · RENTAS · APARTADOS", v: String(k.plan + k.renta + k.apt), s: `${k.plan} planes · ${k.renta} rentas · ${k.apt} apartados`, onClick: () => ir({ tab: k.renta ? "renta" : k.plan ? "plan" : "apt" }) },
      { k: "RETENIDO AHORA", v: money(k.retc), s: `${k.ret} ${k.ret === 1 ? "cobro espera" : "cobros esperan"} que el negocio acepte` },
      { k: "COMISIÓN 90 D", v: money(k.com), s: "solo tarjeta en la app" },
      { k: "DEVUELTO 90 D", v: money(k.dev), s: "a tarjetas" },
      { k: "RETENCIONES QUE FALLARON", v: String(k.fallos), s: k.fallos ? "citas de más de 7 días: se cobra en el local" : "ninguna en 90 días", onClick: k.fallos ? () => ir({ tab: "cita" }) : undefined },
    ] },
    { type: "tabs", items: ([["all", "Todas"], ["ped", "Pedidos"], ["merc", "Mercado"], ["rsv", "Reservaciones"], ["cita", "Citas"], ["sal", "Doctores"], ["pro", "Profesionales"], ["plan", "Planes"], ["renta", "Rentas"], ["apt", "Apartados"], ["fiesta", "Fiestas"], ["viaje", "Viajes"], ["noche", "Noche"]] as const).map(([t, l]) => ({ l, on: f.tab === t, onClick: () => ir({ tab: t === "all" ? null : t }) })) },
  ];
  const a = d.total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(d.total, f.pag * porPagina);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="# de pedido, reservación o cita, negocio o cliente" aria-label="Buscar transacción"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={[{ type: "chips", items: (Object.keys(ST) as EstTx[]).map((x) => ({ l: { pend: "Pendiente", curso: "En curso", done: "Terminado", cx: "Cancelado", no: "No se dio" }[x], v: f.st.includes(x) ? "selected" : "filter", onClick: () => tg(x) })) }]} />
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "card", t: "Nada con esos filtros", s: "Prueba otro estado o busca por número." }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: x.k === "night" ? "drink" : x.k === "party" ? "party" : x.k === "trip" ? "truck" : x.k === "order" || x.k === "hold" ? "bag" : x.k === "appointment" || x.k === "plan" ? "calendar" : x.k === "rental" ? "wrench" : "restaurant", title: `${({ order: "Pedido", market_order: "Pedido del mercado", appointment: "Cita", table: "Reservación", plan: "Plan", rental: "Renta", hold: "Apartado", party: "Fiesta", trip: "Viaje", night: x.no?.k === "lista" ? "Lista" : "Mesa" } as Record<string, string>)[x.k]} ${x.k === "order" ? `#${x.num}` : x.num} · ${x.bname}`,
          sub: x.k === "night" && x.no ? `${x.quien} · ${cuando(x.at)} · ${x.svc ?? (x.no.k === "lista" ? "lista" : "mesa")} · noche del ${x.no.noche} · ${x.no.pax} persona${x.no.pax > 1 ? "s" : ""}${x.no.inN != null ? ` · entraron ${x.no.inN}` : ""}${x.no.cierre ? ` · ${({ entro: "entró", sin_entrar: "no entró", sin_marcar: "sin marcar en la puerta", noid: "no entró: sin identificación", nollegaron: "no llegaron", sin_respuesta: "venció sin respuesta", a_tiempo: "canceló a tiempo", tarde: "canceló tarde", salio: "salió de la lista", solicitud: "retiró la solicitud", negocio: "canceló el local" } as Record<string, string>)[x.no.cierre] ?? x.no.cierre}` : ""} · ${x.dep ? `depósito ${money(x.dep)}${x.pago ? ` ${PG[x.pago] ?? x.pago}` : ""}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}${x.no.perdio ? " · se quedó con el local" : ""}${x.comision && x.pago !== "released" ? ` · comisión ${money(x.comision)}` : ""}` : "sin depósito"}${x.detalle === "business" ? " · canceló el local" : ""}`
            : x.k === "trip" && x.vi ? `${x.quien} · ${cuando(x.at)} · ${x.svc ?? "viaje"} · ${({ asiento: "asiento", priv: "vehículo completo", caja: "caja", cotiza: "mudanza" } as Record<string, string>)[x.vi.k] ?? x.vi.k} · el ${x.vi.dia} · ${x.vi.k === "caja" ? `${x.vi.n} caja${x.vi.n > 1 ? "s" : ""}` : x.vi.k === "cotiza" ? (x.vi.precioV ? `precio cerrado v${x.vi.precioV}` : "sin precio aceptado") : `${x.vi.n} pasajero${x.vi.n > 1 ? "s" : ""}`} · ${x.total ? money(x.total) : "$0"}${x.pago ? ` · ${x.tarjeta ?? "tarjeta"} ${PG[x.pago] ?? x.pago}` : ""}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}${x.vi.mitad ? ` · se cobró la mitad ${money(x.vi.mitad)}` : ""}${x.vi.salida ? " · el negocio canceló la salida" : x.detalle === "business" ? " · canceló el negocio" : ""}${x.vi.rastreo ? ` · rastreo ${x.vi.rastreo}` : ""}${x.comision && x.pago !== "released" ? ` · comisión ${money(x.comision)}` : ""}`
            : x.k === "party" && x.fi ? `${x.quien} · ${cuando(x.at)} · ${x.fi.vis ? "visita al salón" : `${x.svc ?? "fiesta"}${x.fi.g ? ` · ${x.fi.g} invitados` : ""}`} · el ${x.fi.dia} · ${x.dep ? `depósito ${money(x.dep)}${x.pago ? ` ${PG[x.pago] ?? x.pago}` : ""}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}${x.fi.perdio ? " · se quedó con el negocio" : ""}${x.comision && x.pago !== "released" ? ` · comisión ${money(x.comision)}` : ""}` : "sin depósito"}${x.fi.v ? ` · acuerdo v${x.fi.v}` : ""}${x.detalle === "business" ? " · canceló el negocio" : ""}`
            : x.k === "market_order" ? `${x.quien} · ${cuando(x.at)} · ${E_M(x)}` : x.k === "plan" || x.k === "rental" || x.k === "hold" ? `${x.quien} · ${cuando(x.at)} · ${x.k === "hold" ? `${x.lay ? `plan ${money(x.lay.pagado)} de ${money(x.lay.total)} · ${({ pending: "por confirmar", active: "al día", late: "atrasado", paid: "pagado", cancelled: "cancelado", declined: "no lo tenían" } as Record<string, string>)[x.lay.st] ?? x.lay.st}` : x.mode === "delivery" ? `envío · cobrado ${money(x.cob)}${x.reten ? ` · retenido ${money(x.reten)}` : ""}` : `${money(x.total)} en la caja · sin cobro en la app`}${x.tallas ? ` · talla ${x.tallas}` : ""}` : `cobrado ${money(x.cob)}${x.reten ? ` · retenido ${money(x.reten)}` : ""}${x.svc ? ` · ${x.svc}` : ""}`}` : `${x.quien} · ${cuando(x.at)} · ${x.k === "order" ? `${money(x.total)}${x.mode === "delivery" ? " · delivery" : " · pickup"}${x.pago ? ` · ${x.tarjeta ?? "tarjeta"} ${PG[x.pago] ?? x.pago}${x.devuelto ? ` ${money(x.devuelto)}` : ""} · comisión ${money(x.comision)}${x.disputa ? ` · ${DISP[x.disputa] ?? "disputa"}` : ""}` : " · en el local"}` : x.k === "appointment" && x.rub === "salud" ? `Cita de salud · ${x.segOk === null ? "sin seguro" : x.segOk ? "seguro aceptado" : "seguro no aceptado"} · nada se cobra en la app`
            : x.k === "appointment" && x.rub === "pro" ? `${x.svc ? `${x.svc} · ` : ""}${x.proTot != null ? `total por escrito ${money(x.proTot)}` : "sin total aún"}${x.proPaso ? ` · ${({ consulted: "pasó la consulta", quote: "total mandado", hired: "contratado", done: "trámite terminado", nohire: "no contrató" } as Record<string, string>)[x.proPaso] ?? ""}` : ""} · nada se cobra en la app`
            : x.k === "appointment" ? `${x.svc ? `${x.svc} · ` : ""}${money(x.total)}${x.dep ? ` · depósito ${money(x.dep)}` : " · sin depósito"}${x.pago ? ` · ${x.tarjeta ?? "tarjeta"} ${PG[x.pago] ?? x.pago}${x.devuelto ? ` ${money(x.devuelto)}` : ""} · comisión ${money(x.comision)}${x.disputa ? ` · ${DISP[x.disputa] ?? "disputa"}` : ""}` : ""}${x.estV ? ` · estimado${x.estV > 1 ? ` (${x.estV} versiones)` : ""}: aprobado ${money(x.estAp)}${x.estCob ? ` · cobrado en la app ${money(x.estCob)}` : ""}` : ""}${x.estFallo ? " · retención no renovada" : ""}` : `mesa para ${x.p ?? "—"}`}${x.st === "cx" && x.detalle ? ` · canceló ${x.detalle === "user" ? "el cliente" : x.detalle === "business" ? "el negocio" : x.detalle === "admin" ? "To’Latino" : "el sistema"}` : ""}`,
          tag: ST[x.st][0], tone: ST[x.st][1],
          actions: [{ label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}`) }, { label: "Ver cliente", variant: "secondary", onClick: () => router.push(`/admin/usuarios/${x.uid}`) },
            ...(devolver && DEVUELVE.has(x.k) && (x.pago === "captured" || x.pago === "partially_refunded") ? [{ label: "Devolver", variant: "secondary", onClick: () => { const clave = crypto.randomUUID(); setConf({
              titulo: x.k === "night" ? `Devolver depósito · noche ${x.num}` : x.k === "party" ? `Devolver depósito · fiesta ${x.num}` : x.k === "appointment" ? `Devolver depósito · cita ${x.num}` : x.k === "trip" ? `Devolver dinero · viaje ${x.num}` : `Devolver dinero · pedido #${x.num}`, cta: "Devolver", peligro: true, sub: `Hasta ${money((x.k === "appointment" || x.k === "party" || x.k === "night" ? x.dep : x.total) - x.devuelto)}. Vuelve a la tarjeta del cliente en 3 a 5 días hábiles; la comisión baja en proporción. El motivo lo ve el cliente y queda en la auditoría.`,
              valor: { k: "MONTO EN DÓLARES", ini: (((x.k === "appointment" || x.k === "party" || x.k === "night" ? x.dep : x.total) - x.devuelto) / 100).toFixed(2), max: 8 }, plantillas: x.k === "night" ? ["El local no respetó la mesa.", "El local canceló la noche.", "Cobro duplicado."] : x.k === "trip" ? ["El negocio no salió.", "El viaje no fue como se acordó.", "Cobro duplicado."] : x.k === "party" ? ["El negocio canceló la fiesta.", "No se cumplió el acuerdo.", "Cobro duplicado."] : x.k === "appointment" ? ["El negocio canceló la cita.", "No se devolvió el depósito a tiempo.", "Cobro duplicado."] : ["Falta un plato del pedido.", "El pedido llegó mal.", "El negocio no entregó el pedido.", "Cobro duplicado."],
              hacer: (m, _e, v) => devolverTx(x.num, v, m, clave) }); } }] : []),
            // Sandbox (2r): simular la disputa del banco y, ya respondida, el resultado.
            ...(sim && devolver && x.pid && !x.disputa && (x.pago === "captured" || x.pago === "partially_refunded") ? [{ label: "Simular disputa", variant: "secondary", onClick: () => setConf({
              titulo: `Simular disputa · pedido #${x.num}`, cta: "Simular", sub: "Solo en el sandbox: como si el cliente reclamara el cobro con su banco. Abre el caso en Colas y avisa al negocio.",
              elegir: { label: "MOTIVO DEL BANCO", items: [{ k: "product_not_received", l: "No recibió el pedido" }, { k: "fraudulent", l: "No hizo la compra" }, { k: "product_unacceptable", l: "Llegó mal" }, { k: "duplicate", l: "Cobro doble" }] },
              plantillas: ["Prueba de disputa en el sandbox."], hacer: (_m, e) => disputaSimular(x.pid!, e ?? "product_not_received") }) }] : []),
            ...(sim && devolver && x.pid && x.disputa === "under_review" ? [
              { label: "Banco: gana el negocio", variant: "secondary", onClick: () => setConf({ titulo: "Simular resultado · gana el negocio", cta: "Simular", plantillas: ["Prueba en el sandbox."], hacer: () => disputaSimularResultado(x.pid!, true) }) },
              { label: "Banco: gana el cliente", variant: "secondary", onClick: () => setConf({ titulo: "Simular resultado · gana el cliente", cta: "Simular", peligro: true, plantillas: ["Prueba en el sandbox."], hacer: () => disputaSimularResultado(x.pid!, false) }) },
            ] : [])],
        }))} />}
      {d.total > porPagina ? <A.Pager label={`${a}–${b} · ${d.total}`} hasPrev={f.pag > 1} hasNext={b < d.total} onPrev={() => ir({ pag: String(f.pag - 1) })} onNext={() => ir({ pag: String(f.pag + 1) })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
