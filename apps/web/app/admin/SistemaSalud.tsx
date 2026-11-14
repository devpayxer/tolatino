"use client";
/* 9j · Super Admin › Sistema › Salud (prototipo secSys «health»: kpis + filas por servicio + mantenimiento; lib/sistema/salud.ts). Lee el sandbox en
   el sandbox. Mantenimiento programado: se programa con su aviso ES/EN y se cancela con motivo (nunca se edita). Compuesto con PanelBloques. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DatosSalud, Servicio } from "@/lib/sistema/salud";
import { mantenimientoCancelar, mantenimientoProgramar } from "./acciones-sistema";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PestanasSistema } from "./sistema/Pestanas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export function SistemaSalud({ d, l, editar }: { d: DatosSalud; l: L; editar: boolean }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [desde, setDesde] = useState(""), [hasta, setHasta] = useState(""), [es, setEs] = useState("Estamos haciendo un cambio. Volvemos en unos minutos."), [en, setEn] = useState("We are making a change. Back in a few minutes.");
  const est = useRef({ desde, hasta, es, en }); est.current = { desde, hasta, es, en };
  const SERV: Record<Servicio, [string, string, string]> = {
    base: ["Base de datos", "Database", "folder"], barrido: ["Trabajos del barrido (cada minuto)", "Sweep jobs (every minute)", "clock"], push: ["Cola de los avisos push", "Push notification queue", "bell"],
    disco: ["Disco del servidor", "Server disk", "grid"], errores: ["Errores (web, apps y servidor)", "Errors (web, apps and server)", "warning"],
  };
  const hecho = (m: string) => { setToast(m); setConf(null); router.refresh(); };
  const res = (r: { ok: boolean; msg: { es: string; en: string } }) => (r.ok ? { ok: true as const, mensaje: E(r.msg.es, r.msg.en) } : { ok: false as const, mensaje: E(r.msg.es, r.msg.en) });
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · SALUD", "SYSTEM · HEALTH"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => hecho(r.mensaje ?? E("Listo.", "Done."))} />
      <Toast t={toast} desk={desk} />
    </div>);

  const malos = d.servicios.filter((s) => s.ok === false).length;
  const B: Bloque[] = [
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("DISPONIBILIDAD", "UPTIME"), v: d.disponibilidad == null ? "—" : `${d.disponibilidad} %`, s: E("la base, últimos 30 días", "the database, last 30 days"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "P95", v: d.p95 == null ? "—" : `${Math.round(d.p95)} ms`, s: E("la base, 24 h", "the database, 24 h") },
      { k: E("ERRORES 24 H", "ERRORS 24 H"), v: String(d.errores.web + d.errores.apps + d.errores.servidor), s: E(`${d.errores.servidor} del servidor · ${d.errores.web} web · ${d.errores.apps} apps`, `${d.errores.servidor} server · ${d.errores.web} web · ${d.errores.apps} apps`) },
      { k: E("TRABAJOS CON ERROR", "JOBS WITH ERRORS"), v: String(d.trabajosConError.length), s: E("del barrido", "of the sweep") },
    ] },
  ];
  if (malos) B.push({ type: "note", tone: "danger", icon: "warning", t: E(`${malos} ${malos === 1 ? "servicio para revisar" : "servicios para revisar"}.`, `${malos} ${malos === 1 ? "service to check" : "services to check"}.`) });
  B.push({ type: "rows", k: E("SERVICIOS · LO ÚLTIMO QUE MIDIÓ EL BARRIDO (CADA 5 MIN)", "SERVICES · LATEST SWEEP MEASUREMENT (EVERY 5 MIN)"), cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.servicios.map((s) => ({
    key: s.service, icon: s.ok === false ? "warning" : s.ok ? "check" : "clock", ibg: s.ok === false ? "rgba(138,90,0,.12)" : "rgba(0,168,143,.12)", t: E(SERV[s.service][0], SERV[s.service][1]),
    s: s.at ? `${s.detail ?? ""} · ${cuando(s.at)}${s.caidas24 ? ` · ${s.caidas24} ${E("fallos en 24 h", "failures in 24 h")}` : ""}` : E("Todavía sin medir: el barrido lo mide cada 5 minutos.", "Not measured yet: the sweep measures it every 5 minutes."),
    tag: s.ok == null ? E("SIN DATOS", "NO DATA") : s.ok ? E("BIEN", "HEALTHY") : E("REVISAR", "CHECK"), tone: s.ok == null ? "neutral" : s.ok ? "signal" : "danger" })) });
  if (d.trabajosConError.length) B.push({ type: "rows", k: E("TAREAS DEL BARRIDO CON ERROR", "SWEEP TASKS WITH ERRORS"), items: d.trabajosConError.map((j) => ({ key: j.name, icon: "warning", t: j.name, s: `${j.error}${j.at ? ` · ${cuando(j.at)}` : ""}`, tag: E("REVISAR", "CHECK"), tone: "danger" })) });
  B.push({ type: "rows", k: E("LLAVES Y CERTIFICADOS QUE VENCEN", "KEYS AND CERTIFICATES THAT EXPIRE"), items: d.llaves.length ? d.llaves.map((k) => ({ key: `${k.kind}${k.version}`, icon: "key", t: `${k.kind} · v${k.version}`,
    s: k.dias < 0 ? E(`Venció el ${k.vence}`, `Expired on ${k.vence}`) : E(`Vence el ${k.vence} (en ${k.dias} días)`, `Expires on ${k.vence} (in ${k.dias} days)`),
    tag: k.dias < 0 ? E("VENCIDA", "EXPIRED") : k.dias <= 30 ? E("RENOVAR", "RENEW") : E("BIEN", "OK"), tone: k.dias <= 30 ? "danger" : "signal", onClick: () => router.push("/admin/sistema/integraciones"), chev: true }))
    : [{ key: "sin", icon: "key", t: E("Ninguna llave del llavero tiene fecha de vencimiento", "No keychain key has an expiry date"), s: E("Al subir una llave que vence (certificados, tokens), su fecha se avisa a los Admins 30 días antes.", "When a key that expires is uploaded (certificates, tokens), Admins are warned 30 days before.") }] });
  B.push({ type: "rows", k: E("DESPLIEGUES Y VUELTAS ATRÁS", "DEPLOYS AND ROLLBACKS"), items: [{ key: "dep", icon: "works", t: d.despliegues ? E("Últimos despliegues", "Latest deploys") : E("Llegan cuando se encienda producción", "They arrive when production is turned on"),
    s: E("En el sandbox, cada despliegue lo hace tolatino-sync y su estado se ve en /estado/ del servidor. La vuelta atrás automática y su registro nacen con producción.", "In the sandbox each deploy is done by tolatino-sync and its state is at the server's /estado/. Automatic rollback and its log are born with production.") }] });
  const proximo = d.mantenimiento.find((m) => m.estado === "programado" || m.estado === "en_curso");
  B.push({ type: "note", tone: proximo ? "warn" : "info", icon: "clock", t: proximo ? E(`Mantenimiento ${proximo.estado === "en_curso" ? "en curso" : "programado"}: ${cuando(proximo.desde)} → ${cuando(proximo.hasta)}. «${proximo.es}»`, `Maintenance ${proximo.estado === "en_curso" ? "in progress" : "scheduled"}: ${cuando(proximo.desde)} → ${cuando(proximo.hasta)}. «${proximo.en}»`) : E("Sin mantenimiento programado.", "No maintenance scheduled.") });
  if (d.mantenimiento.length) B.push({ type: "rows", k: E("MANTENIMIENTOS", "MAINTENANCE"), items: d.mantenimiento.map((m) => ({ key: m.id, icon: "clock", t: `${cuando(m.desde)} → ${cuando(m.hasta)}`, s: `${E(m.es, m.en)} · ${m.motivo}${m.por ? ` · ${m.por}` : ""}`,
    tag: { programado: E("PROGRAMADO", "SCHEDULED"), en_curso: E("EN CURSO", "IN PROGRESS"), pasado: E("PASÓ", "PAST"), cancelado: E("CANCELADO", "CANCELLED") }[m.estado], tone: m.estado === "programado" || m.estado === "en_curso" ? "action" : "neutral",
    acts: editar && (m.estado === "programado" || m.estado === "en_curso") ? [{ l: E("Cancelar", "Cancel"), v: "secondary", onClick: () => setConf({ titulo: E("Cancelar el mantenimiento", "Cancel the maintenance"), peligro: true, cta: E("Cancelar", "Cancel"),
      sub: E("No se borra: queda cancelado con tu motivo.", "It is not deleted: it stays cancelled with your reason."), plantillas: [E("Ya no hace falta.", "No longer needed."), E("Se cambia de hora.", "Moved to another time.")], hacer: async (mm) => res(await mantenimientoCancelar(m.id, mm)) }) }] : undefined })) });
  const prog: Bloque[] = editar ? [
    { type: "group", k: E("PROGRAMAR UN MANTENIMIENTO", "SCHEDULE MAINTENANCE") },
    { type: "field", k: E("DESDE (AAAA-MM-DD HH:MM, HORA DE HAZLETON)", "FROM (YYYY-MM-DD HH:MM, HAZLETON TIME)"), val: desde, onChange: setDesde, ph: "2026-11-20 02:00", max: 16 },
    { type: "field", k: E("HASTA (6 HORAS COMO MÁXIMO)", "UNTIL (6 HOURS AT MOST)"), val: hasta, onChange: setHasta, ph: "2026-11-20 03:00", max: 16 },
    { type: "field", k: E("AVISO EN ESPAÑOL", "NOTICE IN SPANISH"), val: es, onChange: setEs, max: 200, count: `${es.length}/200` },
    { type: "field", k: E("AVISO EN INGLÉS", "NOTICE IN ENGLISH"), val: en, onChange: setEn, max: 200, count: `${en.length}/200` },
    { type: "acts", items: [{ l: E("Programar", "Schedule"), v: "action", off: !(desde.trim() && hasta.trim() && es.trim() && en.trim()), onClick: () => setConf({ titulo: E("Programar el mantenimiento", "Schedule the maintenance"), cta: E("Programar", "Schedule"),
      sub: E("Queda en el calendario y en la auditoría. La página que ven los vecinos durante esa hora la sirve el servidor web cuando se encienda producción.", "It goes in the calendar and the audit log. The page neighbors see during that time is served by the web server once production is turned on."), plantillas: [E("Cambio de la base.", "Database change."), E("Cambio del servidor.", "Server change.")],
      hacer: async (m) => { const r = await mantenimientoProgramar(est.current.desde, est.current.hasta, est.current.es, est.current.en, m); if (r.ok) { setDesde(""); setHasta(""); } return res(r); } }) }] },
  ] : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-salud-entorno={d.entorno}>
      <PanelBloques bloques={[{ type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Salud", "Health"), h1: desk ? 26 : 22,
        s: E("Cómo está la plataforma ahora: servicios, errores, trabajos, llaves que vencen y el mantenimiento programado.", "How the platform is doing now: services, errors, jobs, keys that expire and scheduled maintenance.") }, selectorIdioma(l, router)]} h1={desk ? 26 : 22} />
      <PestanasSistema on="salud" l={l} />
      <PanelBloques bloques={B} />
      {prog.length ? <PanelBloques bloques={prog} /> : null}
      <Toast t={toast} desk={desk} />
    </div>);
}
