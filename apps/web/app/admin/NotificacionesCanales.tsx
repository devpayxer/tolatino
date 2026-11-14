"use client";
/* 9l · Super Admin › Notificaciones › «SMS y WhatsApp» y «Plantillas de WhatsApp» (en los dos idiomas del admin). La entrega de cada SMS por el único camino
   (sms_outbox: entregado, reintento, falló, sin proveedor, con sus intentos; sin teléfonos, solo los últimos 4), la de WhatsApp (los `statuses` de Meta),
   el tope global de remitentes y sus alertas; y las plantillas para escribir primero por WhatsApp con su estado en Meta («Mandar a Meta»; en el sandbox,
   simular su respuesta). Todo cambio con motivo y auditoría (ConfirmarMotivo). Lo decide el servidor (lib/sms, lib/canales). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FilaSms } from "@/lib/sms";
import type { PlantillaWa } from "@/lib/canales/plantillas-wa";
import { waMandar, waSimular } from "./acciones-canales";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export type DatosCanalesNotif = {
  sms: { kpi: { total: number; entregados: number; reintentos: number; fallidos: number; sin_proveedor: number; pendientes: number; reintentados_ok: number; sim: number };
    filas: FilaSms[]; sig: string | null; whatsapp: { enviados: number; entregados: number; fallidos: number; ventana: number } } | null;
  tope: { tope: number; alertas: { at: string; n: number; tope: number }[]; ahora: number } | null;
  wa: { filas: PlantillaWa[]; meta: boolean; sandbox: boolean } | null;
};
type Tab = "canales" | "wa";
const EST: Record<string, [string, string, string]> = {
  pendiente: ["PENDIENTE", "PENDING", "neutral"], enviado: ["ENVIADO", "SENT", "neutral"], entregado: ["ENTREGADO", "DELIVERED", "signal"], reintento: ["REINTENTO", "RETRY", "action"],
  fallo: ["FALLÓ", "FAILED", "danger"], vencido: ["VENCIÓ", "EXPIRED", "danger"], sin_proveedor: ["SIN PROVEEDOR", "NO PROVIDER", "danger"],
};
const WA: Record<string, [string, string, string]> = {
  borrador: ["BORRADOR", "DRAFT", "neutral"], enviada: ["EN REVISIÓN EN META", "IN REVIEW AT META", "action"], aprobada: ["APROBADA", "APPROVED", "signal"],
  rechazada: ["RECHAZADA", "REJECTED", "danger"], pausada: ["PAUSADA", "PAUSED", "danger"], deshabilitada: ["DESHABILITADA", "DISABLED", "danger"], fallo: ["NO LLEGÓ A META", "DID NOT REACH META", "danger"],
};
const ORIGEN: Record<string, [string, string]> = { aviso: ["Aviso", "Notification"], telefono: ["A un número sin cuenta", "To a number with no account"], codigo: ["Código para entrar", "Sign-in code"], compa: ["El Compa", "El Compa"], prueba: ["Prueba", "Test"] };
const USO: Record<string, [string, string]> = { codigo: ["El código para entrar", "The sign-in code"], boletos: ["Tus boletos", "Your tickets"], cita: ["Tu cita confirmada", "Your confirmed appointment"], soporte: ["Te respondió Soporte", "Support replied"] };

export function NotificacionesCanales({ d, tab, puede, l }: { d: DatosCanalesNotif; tab: Tab; puede: boolean; l: L }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It is in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("NOTIFICACIONES", "NOTIFICATIONS"), t: E("Plantillas de WhatsApp", "WhatsApp templates"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const ir = (t: string, antes?: string) => router.push(`/admin/notificaciones?tab=${t}${antes ? `&antes=${antes}` : ""}`);
  const B: Bloque[] = [
    { type: "head", eye: E("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: E("Notificaciones", "Notifications"), s: E("La entrega de cada SMS y de WhatsApp, el tope de remitentes y las plantillas de WhatsApp con su estado en Meta.", "Delivery of each SMS and WhatsApp message, the sender cap and the WhatsApp templates with their status at Meta."), h1: desk ? 26 : 22 },
    selectorIdioma(l, router),
    { type: "tabs", items: ([["tpl", E("Plantillas", "Templates")], ["log", E("Envíos", "Sends")], ["push", "Push"], ["canales", E("SMS y WhatsApp", "SMS and WhatsApp")], ["wa", E("Plantillas de WhatsApp", "WhatsApp templates")], ["mail", E("Correos", "Emails")], ["rules", E("Reglas", "Rules")]] as const)
      .map(([t, x]) => ({ l: x, on: tab === t, onClick: () => router.push(t === "tpl" ? "/admin/notificaciones" : `/admin/notificaciones?tab=${t}`) })) },
  ];
  if (tab === "canales" && d.sms) {
    const k = d.sms.kpi, wa = d.sms.whatsapp;
    B.push({ type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("SMS · 24 H", "SMS · 24 H"), v: String(k.total), s: k.sim ? E(`${k.sim} por el simulador (sandbox)`, `${k.sim} through the simulator (sandbox)`) : E("por Telnyx", "through Telnyx"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("ENTREGADOS", "DELIVERED"), v: String(k.entregados), s: k.reintentados_ok ? E(`${k.reintentados_ok} llegaron en un reintento`, `${k.reintentados_ok} arrived on a retry`) : E("lo confirma el operador", "confirmed by the carrier") },
      { k: E("EN REINTENTO", "RETRYING"), v: String(k.reintentos), s: E("espera creciente, hasta el tope", "growing wait, up to the cap") },
      { k: E("FALLARON", "FAILED"), v: String(k.fallidos), s: k.sin_proveedor ? E(`${k.sin_proveedor} sin proveedor`, `${k.sin_proveedor} with no provider`) : E("permanentes o sin intentos", "permanent or out of attempts"), sFg: k.fallidos ? "var(--tl-danger)" : undefined },
      { k: "WHATSAPP · 24 H", v: String(wa.enviados), s: E(`${wa.entregados} entregados · ${wa.fallidos} fallaron · ${wa.ventana} fuera de las 24 h`, `${wa.entregados} delivered · ${wa.fallidos} failed · ${wa.ventana} outside the 24 h`) },
    ] });
    B.push({ type: "note", tone: "info", icon: "phone", t: E(
      "Un solo camino para todos los SMS (avisos, el código para entrar, los SMS a números sin cuenta y El Compa): si el proveedor no lo acepta o el operador no lo entrega, se reintenta con espera creciente; lo permanente (STOP, número inválido) y un código vencido no. El estado llega firmado del webhook de Telnyx y de Meta. En el sandbox contesta el simulador: 570-555-0911 falla una vez, 570-555-0912 es inválido y 570-555-0913 no contesta una vez.",
      "One path for every SMS (notifications, the sign-in code, SMS to numbers with no account and El Compa): if the provider does not accept it or the carrier does not deliver it, it is retried with growing waits; permanent failures (STOP, invalid number) and an expired code are not. Status arrives signed from the Telnyx and Meta webhooks. In the sandbox the simulator answers: 570-555-0911 fails once, 570-555-0912 is invalid and 570-555-0913 does not answer once.") });
    if (d.tope) {
      B.push({ type: "group", k: E("TOPE GLOBAL DE REMITENTES", "GLOBAL SENDER CAP") });
      B.push({ type: "rows", items: [
        { key: "tope", icon: "shield", t: E(`${d.tope.tope} números distintos por minuto`, `${d.tope.tope} different numbers per minute`), s: E(`Ahora: ${d.tope.ahora} en el último minuto. A los que pasan del tope no se les contesta en ese minuto y el equipo recibe una alerta (una cada 10 minutos). STOP siempre se respeta. Se cambia en Sistema › Configuración › Avisos y canales.`, `Now: ${d.tope.ahora} in the last minute. Those over the cap get no reply that minute and the team gets an alert (one every 10 minutes). STOP is always honored. Change it in System › Configuration › Notifications and channels.`) },
        ...d.tope.alertas.map((a, i) => ({ key: `al${i}`, icon: "warning", t: E(`${a.n} números en un minuto`, `${a.n} numbers in one minute`), s: E(`El tope era ${a.tope}.`, `The cap was ${a.tope}.`), m: cuando(a.at), tag: E("ALERTA", "ALERT"), tone: "danger" })),
      ] });
    }
    B.push({ type: "group", k: E("CADA SMS · SIN TELÉFONOS", "EACH SMS · NO PHONE NUMBERS") });
    if (!d.sms.filas.length) B.push({ type: "empty", icon: "phone", t: E("Todavía no sale ningún SMS", "No SMS has gone out yet"), s: E("Aparecen aquí cuando sale un aviso por SMS o un código para entrar.", "They show here when a notification goes out by SMS or a sign-in code.") });
    else B.push({ type: "rows", items: d.sms.filas.map((x) => ({
      key: x.id, icon: "phone", t: `${E(...(ORIGEN[x.origen] ?? [x.origen, x.origen]))}${x.tpl ? ` · ${x.tpl}` : ""} · ···${x.ultimos}`,
      s: `${x.proveedor === "sim" ? E("Simulador", "Simulator") : "Telnyx"} · ${E(`${x.intentos} ${x.intentos === 1 ? "intento" : "intentos"}`, `${x.intentos} ${x.intentos === 1 ? "attempt" : "attempts"}`)}${x.error ? ` · ${x.error}` : ""}${x.entregado ? ` · ${E("entregado", "delivered")} ${cuando(x.entregado)}` : ""}`,
      m: cuando(x.at), tag: E(EST[x.estado]?.[0] ?? x.estado, EST[x.estado]?.[1] ?? x.estado), tone: EST[x.estado]?.[2] ?? "neutral",
    })) });
    if (d.sms.sig) B.push({ type: "acts", items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir("canales", d.sms!.sig!) }] });
  }
  if (tab === "wa" && d.wa) {
    B.push({ type: "note", tone: "info", icon: "chat", t: d.wa.meta
      ? E("Fuera de la ventana de 24 h, WhatsApp solo deja escribir primero con una plantilla aprobada por Meta. «Mandar a Meta» la manda a revisión; su respuesta llega sola, firmada.", "Outside the 24 h window, WhatsApp only lets you write first with a template approved by Meta. «Send to Meta» sends it for review; its answer arrives on its own, signed.")
      : E("Fuera de la ventana de 24 h, WhatsApp solo deja escribir primero con una plantilla aprobada por Meta. Sin la cuenta de WhatsApp Business conectada, «Mandar a Meta» va al simulador del sandbox y su respuesta se simula aquí.", "Outside the 24 h window, WhatsApp only lets you write first with a template approved by Meta. Without the WhatsApp Business account connected, «Send to Meta» goes to the sandbox simulator and its answer is simulated here.") });
    B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.wa.filas.map((p) => {
      const e = WA[p.estado] ?? [p.estado, p.estado, "neutral"], ultimo = p.historial[0];
      const acts: { l: string; icon: string; onClick: () => void }[] = [];
      if (puede && ["borrador", "rechazada"].includes(p.estado)) acts.push({ l: E("Mandar a Meta", "Send to Meta"), icon: "right", onClick: () => setConf({ titulo: E(`Mandar ${p.nombre} (${p.idioma}) a Meta`, `Send ${p.nombre} (${p.idioma}) to Meta`), cta: E("Mandar", "Send"),
        sub: E("Meta revisa ESTE texto; mientras está en revisión no se cambia. El motivo queda en la auditoría.", "Meta reviews THIS text; while it is in review it does not change. The reason stays in the audit log."), hacer: (m) => waMandar(p.id, m) }) });
      if (puede && d.wa!.sandbox && !d.wa!.meta && p.estado === "enviada") {
        acts.push({ l: E("Simular: aprobada", "Simulate: approved"), icon: "check", onClick: () => setConf({ titulo: E(`Simular que Meta aprobó ${p.nombre}`, `Simulate that Meta approved ${p.nombre}`), cta: E("Aprobar", "Approve"), hacer: (m) => waSimular(p.id, true, m) }) });
        acts.push({ l: E("Simular: rechazada", "Simulate: rejected"), icon: "close", onClick: () => setConf({ titulo: E(`Simular que Meta rechazó ${p.nombre}`, `Simulate that Meta rejected ${p.nombre}`), cta: E("Rechazar", "Reject"), peligro: true,
          sub: E("Escribe el motivo como lo diría Meta: queda en la plantilla.", "Write the reason as Meta would: it stays on the template."), hacer: (m) => waSimular(p.id, false, m) }) });
      }
      return { key: p.id, icon: "chat", t: `${E(...(USO[p.uso] ?? [p.uso, p.uso]))} · ${p.nombre} · ${p.idioma === "es" ? "ES" : "EN"}`, s: p.cuerpo,
        m: [p.categoria, p.motivo ? `${E("MOTIVO", "REASON")}: ${p.motivo}` : null, ultimo ? `${ultimo.via === "meta" ? "META" : ultimo.via === "simulador" ? E("SIMULADOR", "SIMULATOR") : E("EQUIPO", "TEAM")} · ${cuando(ultimo.at)}` : null].filter(Boolean).join(" · "),
        tag: E(e[0], e[1]), tone: e[2], acts: acts.length ? acts : undefined };
    }) });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
