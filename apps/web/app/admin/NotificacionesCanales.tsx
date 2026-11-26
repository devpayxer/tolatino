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
const EST = (E2: (a: string, b: string) => string): Record<string, [string, string]> => ({
  pendiente: [E2("PENDIENTE", "PENDING"), "neutral"], enviado: [E2("ENVIADO", "SENT"), "neutral"], entregado: [E2("ENTREGADO", "DELIVERED"), "signal"], reintento: [E2("REINTENTO", "RETRY"), "action"],
  fallo: [E2("FALLÓ", "FAILED"), "danger"], vencido: [E2("VENCIÓ", "EXPIRED"), "danger"], sin_proveedor: [E2("SIN PROVEEDOR", "NO PROVIDER"), "danger"],
});
const WA = (E2: (a: string, b: string) => string): Record<string, [string, string]> => ({
  borrador: [E2("BORRADOR", "DRAFT"), "neutral"], enviada: [E2("EN REVISIÓN EN META", "IN REVIEW AT META"), "action"], aprobada: [E2("APROBADA", "APPROVED"), "signal"],
  rechazada: [E2("RECHAZADA", "REJECTED"), "danger"], pausada: [E2("PAUSADA", "PAUSED"), "danger"], deshabilitada: [E2("DESHABILITADA", "DISABLED"), "danger"], fallo: [E2("NO LLEGÓ A META", "DID NOT REACH META"), "danger"],
});
const ORIGEN: Record<string, [string, string]> = { aviso: ["Aviso", "Notification"], telefono: ["A un número sin cuenta", "To a number with no account"], codigo: ["Código para entrar", "Sign-in code"], compa: ["El Compa", "El Compa"], prueba: ["Prueba", "Test"] };
const USO = (E2: (a: string, b: string) => string): Record<string, string> => ({ codigo: E2("El código para entrar", "The sign-in code"), boletos: E2("Tus boletos", "Your tickets"), cita: E2("Tu cita confirmada", "Your confirmed appointment"), soporte: E2("Te respondió Soporte", "Support replied") });

export function NotificacionesCanales({ d, tab, puede, l }: { d: DatosCanalesNotif; tab: Tab; puede: boolean; l: L }) {
  const { E2 } = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It is in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("NOTIFICACIONES", "NOTIFICATIONS"), t: E2("Plantillas de WhatsApp", "WhatsApp templates"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const ir = (t: string, antes?: string) => router.push(`/admin/notificaciones?tab=${t}${antes ? `&antes=${antes}` : ""}`);
  const B: Bloque[] = [
    { type: "head", eye: E2("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: E2("Notificaciones", "Notifications"), s: E2("La entrega de cada SMS y de WhatsApp, el tope de remitentes y las plantillas de WhatsApp con su estado en Meta.", "Delivery of each SMS and WhatsApp message, the sender cap and the WhatsApp templates with their status at Meta."), h1: desk ? 26 : 22 },
    selectorIdioma(l, router),
    { type: "tabs", items: ([["tpl", E2("Plantillas", "Templates")], ["log", E2("Envíos", "Sends")], ["push", "Push"], ["canales", E2("SMS y WhatsApp", "SMS and WhatsApp")], ["wa", E2("Plantillas de WhatsApp", "WhatsApp templates")], ["mail", E2("Correos", "Emails")], ["rules", E2("Reglas", "Rules")]] as const)
      .map(([t, x]) => ({ l: x, on: tab === t, onClick: () => router.push(t === "tpl" ? "/admin/notificaciones" : `/admin/notificaciones?tab=${t}`) })) },
  ];
  if (tab === "canales" && d.sms) {
    const k = d.sms.kpi, wa = d.sms.whatsapp;
    B.push({ type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("SMS · 24 H", "SMS · 24 H"), v: String(k.total), s: k.sim ? E2(`${k.sim} por el simulador (sandbox)`, `${k.sim} through the simulator (sandbox)`) : E2("por Telnyx", "through Telnyx"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("ENTREGADOS", "DELIVERED"), v: String(k.entregados), s: k.reintentados_ok ? E2(`${k.reintentados_ok} llegaron en un reintento`, `${k.reintentados_ok} arrived on a retry`) : E2("lo confirma el operador", "confirmed by the carrier") },
      { k: E2("EN REINTENTO", "RETRYING"), v: String(k.reintentos), s: E2("espera creciente, hasta el tope", "growing wait, up to the cap") },
      { k: E2("FALLARON", "FAILED"), v: String(k.fallidos), s: k.sin_proveedor ? E2(`${k.sin_proveedor} sin proveedor`, `${k.sin_proveedor} with no provider`) : E2("permanentes o sin intentos", "permanent or out of attempts"), sFg: k.fallidos ? "var(--tl-danger)" : undefined },
      { k: "WHATSAPP · 24 H", v: String(wa.enviados), s: E2(`${wa.entregados} entregados · ${wa.fallidos} fallaron · ${wa.ventana} fuera de las 24 h`, `${wa.entregados} delivered · ${wa.fallidos} failed · ${wa.ventana} outside the 24 h`) },
    ] });
    B.push({ type: "note", tone: "info", icon: "phone", t: E2(
      "Un solo camino para todos los SMS (avisos, el código para entrar, los SMS a números sin cuenta y El Compa): si el proveedor no lo acepta o el operador no lo entrega, se reintenta con espera creciente; lo permanente (STOP, número inválido) y un código vencido no. El estado llega firmado del webhook de Telnyx y de Meta. En el sandbox contesta el simulador: 570-555-0911 falla una vez, 570-555-0912 es inválido y 570-555-0913 no contesta una vez.",
      "One path for every SMS (notifications, the sign-in code, SMS to numbers with no account and El Compa): if the provider does not accept it or the carrier does not deliver it, it is retried with growing waits; permanent failures (STOP, invalid number) and an expired code are not. Status arrives signed from the Telnyx and Meta webhooks. In the sandbox the simulator answers: 570-555-0911 fails once, 570-555-0912 is invalid and 570-555-0913 does not answer once.") });
    if (d.tope) {
      B.push({ type: "group", k: E2("TOPE GLOBAL DE REMITENTES", "GLOBAL SENDER CAP") });
      B.push({ type: "rows", items: [
        { key: "tope", icon: "shield", t: E2(`${d.tope.tope} números distintos por minuto`, `${d.tope.tope} different numbers per minute`), s: E2(`Ahora: ${d.tope.ahora} en el último minuto. A los que pasan del tope no se les contesta en ese minuto y el equipo recibe una alerta (una cada 10 minutos). STOP siempre se respeta. Se cambia en Sistema › Configuración › Avisos y canales.`, `Now: ${d.tope.ahora} in the last minute. Those over the cap get no reply that minute and the team gets an alert (one every 10 minutes). STOP is always honored. Change it in System › Configuration › Notifications and channels.`) },
        ...d.tope.alertas.map((a, i) => ({ key: `al${i}`, icon: "warning", t: E2(`${a.n} números en un minuto`, `${a.n} numbers in one minute`), s: E2(`El tope era ${a.tope}.`, `The cap was ${a.tope}.`), m: cuando(a.at), tag: E2("ALERTA", "ALERT"), tone: "danger" })),
      ] });
    }
    B.push({ type: "group", k: E2("CADA SMS · SIN TELÉFONOS", "EACH SMS · NO PHONE NUMBERS") });
    if (!d.sms.filas.length) B.push({ type: "empty", icon: "phone", t: E2("Todavía no sale ningún SMS", "No SMS has gone out yet"), s: E2("Aparecen aquí cuando sale un aviso por SMS o un código para entrar.", "They show here when a notification goes out by SMS or a sign-in code.") });
    else B.push({ type: "rows", items: d.sms.filas.map((x) => ({
      key: x.id, icon: "phone", t: `${E2(...(ORIGEN[x.origen] ?? [x.origen, x.origen]))}${x.tpl ? ` · ${x.tpl}` : ""} · ···${x.ultimos}`,
      s: `${x.proveedor === "sim" ? E2("Simulador", "Simulator") : "Telnyx"} · ${E2(`${x.intentos} ${x.intentos === 1 ? "intento" : "intentos"}`, `${x.intentos} ${x.intentos === 1 ? "attempt" : "attempts"}`)}${x.error ? ` · ${x.error}` : ""}${x.entregado ? ` · ${E2("entregado", "delivered")} ${cuando(x.entregado)}` : ""}`,
      m: cuando(x.at), tag: EST(E2)[x.estado]?.[0] ?? x.estado, tone: EST(E2)[x.estado]?.[1] ?? "neutral",
    })) });
    if (d.sms.sig) B.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", onClick: () => ir("canales", d.sms!.sig!) }] });
  }
  if (tab === "wa" && d.wa) {
    B.push({ type: "note", tone: "info", icon: "chat", t: d.wa.meta
      ? E2("Fuera de la ventana de 24 h, WhatsApp solo deja escribir primero con una plantilla aprobada por Meta. «Mandar a Meta» la manda a revisión; su respuesta llega sola, firmada.", "Outside the 24 h window, WhatsApp only lets you write first with a template approved by Meta. «Send to Meta» sends it for review; its answer arrives on its own, signed.")
      : E2("Fuera de la ventana de 24 h, WhatsApp solo deja escribir primero con una plantilla aprobada por Meta. Sin la cuenta de WhatsApp Business conectada, «Mandar a Meta» va al simulador del sandbox y su respuesta se simula aquí.", "Outside the 24 h window, WhatsApp only lets you write first with a template approved by Meta. Without the WhatsApp Business account connected, «Send to Meta» goes to the sandbox simulator and its answer is simulated here.") });
    B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.wa.filas.map((p) => {
      const e = WA(E2)[p.estado] ?? [p.estado, "neutral"], ultimo = p.historial[0];
      const acts: { l: string; icon: string; onClick: () => void }[] = [];
      if (puede && ["borrador", "rechazada"].includes(p.estado)) acts.push({ l: E2("Mandar a Meta", "Send to Meta"), icon: "right", onClick: () => setConf({ titulo: E2(`Mandar ${p.nombre} (${p.idioma}) a Meta`, `Send ${p.nombre} (${p.idioma}) to Meta`), cta: E2("Mandar", "Send"),
        sub: E2("Meta revisa ESTE texto; mientras está en revisión no se cambia. El motivo queda en la auditoría.", "Meta reviews THIS text; while it is in review it does not change. The reason stays in the audit log."), nota: "interna", hacer: (m) => waMandar(p.id, m) }) });
      if (puede && d.wa!.sandbox && !d.wa!.meta && p.estado === "enviada") {
        acts.push({ l: E2("Simular: aprobada", "Simulate: approved"), icon: "check", onClick: () => setConf({ titulo: E2(`Simular que Meta aprobó ${p.nombre}`, `Simulate that Meta approved ${p.nombre}`), cta: E2("Aprobar", "Approve"), nota: "interna", hacer: (m) => waSimular(p.id, true, m) }) });
        acts.push({ l: E2("Simular: rechazada", "Simulate: rejected"), icon: "close", onClick: () => setConf({ titulo: E2(`Simular que Meta rechazó ${p.nombre}`, `Simulate that Meta rejected ${p.nombre}`), cta: E2("Rechazar", "Reject"), peligro: true,
          sub: E2("Escribe el motivo como lo diría Meta: queda en la plantilla.", "Write the reason as Meta would: it stays on the template."), nota: "interna", hacer: (m) => waSimular(p.id, false, m) }) });
      }
      return { key: p.id, icon: "chat", t: `${USO(E2)[p.uso] ?? p.uso} · ${p.nombre} · ${p.idioma === "es" ? "ES" : "EN"}`, s: p.cuerpo,
        m: [p.categoria, p.motivo ? `${E2("MOTIVO", "REASON")}: ${p.motivo}` : null, ultimo ? `${ultimo.via === "meta" ? "META" : ultimo.via === "simulador" ? E2("SIMULADOR", "SIMULATOR") : E2("EQUIPO", "TEAM")} · ${cuando(ultimo.at)}` : null].filter(Boolean).join(" · "),
        tag: e[0], tone: e[1], acts: acts.length ? acts : undefined };
    }) });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
