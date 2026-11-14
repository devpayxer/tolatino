"use client";
/* 9o · Super Admin › Sistema › Despliegues (fase9-apertura.md §4 9o: «cada versión, su salud, vueltas atrás, el OK que la dejó pasar»; hueco del diseño:
   compuesta con PanelBloques como Salud y Respaldos, anotada en REVISION 9o). Arriba lo que importa: qué versión sirve y si alguna volvió atrás; después la
   lista de despliegues, los incidentes con su caso del manual (cerrar uno pide lo que se hizo) y los umbrales de la vuelta atrás (se cambian en
   Configuración › Despliegues). Lee lib/sistema/despliegues.ts. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DatosDespliegues, Resultado } from "@/lib/sistema/despliegues";
import { incidenteCerrar } from "./acciones-sistema";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PestanasSistema } from "./sistema/Pestanas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export function SistemaDespliegues({ d, l, editar }: { d: DatosDespliegues; l: L; editar: boolean }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const RES: Record<Resultado, [string, string, "signal" | "danger" | "action", string]> = {
    ok: ["SIRVIÓ", "SERVED", "signal", "check"], vuelta_atras: ["VOLVIÓ ATRÁS", "ROLLED BACK", "danger", "warning"], fallo: ["NO SALIÓ", "DID NOT GO OUT", "action", "ban"],
  };
  const SEV: Record<string, [string, string]> = { critica: ["CRÍTICO", "CRITICAL"], alta: ["ALTO", "HIGH"], media: ["MEDIO", "MEDIUM"], baja: ["BAJO", "LOW"] };
  const ENT: Record<string, [string, string]> = { pruebas: ["sandbox", "sandbox"], ensayo: ["ensayo", "rehearsal"], produccion: ["producción", "production"] };
  const seg = (a: string | null, b: string | null) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)) : null);
  const dur = (s: number | null) => (s == null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
  const hecho = (m: string) => { setToast(m); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · DESPLIEGUES", "SYSTEM · DEPLOYS"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => hecho(r.mensaje ?? E("Listo.", "Done."))} />
      <Toast t={toast} desk={desk} />
    </div>);
  const ult = d.lista[0], sirve = d.lista.find((x) => x.result === "ok" && d.servido.startsWith(x.commit.slice(0, Math.min(x.commit.length, d.servido.length))));
  const B: Bloque[] = [];
  if (d.entorno !== "produccion") B.push({ type: "note", tone: "ink", icon: "info", t: E(
    "Sandbox: cada despliegue de tolatino-sync queda aquí. Un solo servidor: sin azul/verde ni vuelta atrás sola. En producción (y en su ensayo) la versión nueva arranca junto a la vieja, pasa la puerta de salud y se vigila 10 minutos; si algo sube, vuelve sola.",
    "Sandbox: every tolatino-sync deploy is logged here. One server: no blue/green and no automatic rollback. In production (and its rehearsal) the new version starts next to the old one, passes the health gate and is watched for 10 minutes; if something spikes, it goes back on its own.") });
  if (d.resumen.vueltas24 > 0) B.push({ type: "note", tone: "danger", icon: "warning", t: E(`${d.resumen.vueltas24} ${d.resumen.vueltas24 === 1 ? "vuelta atrás" : "vueltas atrás"} en las últimas 24 h: la versión anterior sigue sirviendo. Mira el incidente abierto.`,
    `${d.resumen.vueltas24} ${d.resumen.vueltas24 === 1 ? "rollback" : "rollbacks"} in the last 24 h: the previous version keeps serving. See the open incident.`) });
  B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
    { k: E("VERSIÓN QUE SIRVE", "SERVING VERSION"), v: d.servido.slice(0, 8), s: sirve ? E(`sana desde ${cuando(sirve.sano ?? sirve.fin)}`, `healthy since ${cuando(sirve.sano ?? sirve.fin)}`) : E("sin despliegue anotado", "no logged deploy"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    { k: E("ÚLTIMO DESPLIEGUE", "LATEST DEPLOY"), v: ult ? E(RES[ult.result][0], RES[ult.result][1]) : "—", s: ult ? `${ult.commit.slice(0, 8)} · ${cuando(ult.fin)}` : E("ninguno todavía", "none yet") },
    { k: E("VUELTAS ATRÁS · 7 DÍAS", "ROLLBACKS · 7 DAYS"), v: String(d.resumen.vueltas7), s: E(`${d.resumen.fallos7} sin salir`, `${d.resumen.fallos7} did not go out`) },
    { k: E("INCIDENTES ABIERTOS", "OPEN INCIDENTS"), v: String(d.resumen.abiertos), s: E("manual en docs/incidentes", "runbook in docs/incidentes") },
  ] });
  B.push({ type: "rows", k: E("DESPLIEGUES · LOS ÚLTIMOS 30", "DEPLOYS · LATEST 30"), items: d.lista.length ? d.lista.map((x) => {
    const v = x.vigilancia ?? {}, met = [v.p5xx != null ? `5xx ${v.p5xx} %` : "", v.p95 != null ? `p95 ${v.p95} ms` : "", v.nuevos != null ? `${E("errores nuevos", "new errors")} ${v.nuevos}` : ""].filter(Boolean).join(" · ");
    const partes = [
      `${ENT[x.entorno]?.[l === "es" ? 0 : 1] ?? x.entorno}${x.color && x.color !== "unico" ? ` · ${x.color}` : ""}`,
      x.migraciones.length ? E(`${x.migraciones.length} ${x.migraciones.length === 1 ? "migración" : "migraciones"}`, `${x.migraciones.length} ${x.migraciones.length === 1 ? "migration" : "migrations"}`) : E("sin migraciones", "no migrations"),
      x.sano ? E(`sana en ${dur(seg(x.inicio, x.sano))}`, `healthy in ${dur(seg(x.inicio, x.sano))}`) : "",
      x.result === "vuelta_atras" ? E(`volvió en ${dur(x.vueltaS)}`, `rolled back in ${dur(x.vueltaS)}`) : "",
      met, x.motivo ?? "", x.ok ? `OK: ${x.ok}` : "", x.prueba ? E("prueba", "test") : "",
    ].filter(Boolean);
    return { key: x.id, icon: RES[x.result][3], t: `${x.commit.slice(0, 8)} · ${cuando(x.fin)}`, s: partes.join(" · "), tag: E(RES[x.result][0], RES[x.result][1]), tone: RES[x.result][2], compact: true };
  }) : [{ key: "nada", icon: "clock", t: E("Todavía no hay despliegues anotados", "No logged deploys yet"), s: E("Cada despliegue del servidor se anota aquí al terminar.", "Every server deploy is logged here when it finishes.") }] });
  B.push({ type: "rows", k: E("INCIDENTES", "INCIDENTS"), items: d.incidentes.length ? d.incidentes.map((x) => ({
    key: x.id, icon: x.fin ? "check" : "warning", t: `${x.caso} · ${cuando(x.inicio)}`,
    s: [x.visto, x.hecho ? `${E("Se hizo", "Done")}: ${x.hecho}` : "", x.manual ?? "", x.fin ? E(`cerrado ${cuando(x.fin)}`, `closed ${cuando(x.fin)}`) : "", x.prueba ? E("prueba", "test") : ""].filter(Boolean).join(" · "),
    tag: `${x.fin ? E("CERRADO", "CLOSED") : E("ABIERTO", "OPEN")} · ${E(SEV[x.severidad]?.[0] ?? x.severidad, SEV[x.severidad]?.[1] ?? x.severidad)}`, tone: x.fin ? "neutral" : x.severidad === "critica" || x.severidad === "alta" ? "danger" : "action",
    acts: editar && !x.fin ? [{ l: E("Cerrar", "Close"), v: "secondary", onClick: () => setConf({ titulo: E("Cerrar el incidente", "Close the incident"), cta: E("Cerrar", "Close"),
      sub: E("Escribe qué se hizo. El incidente no se borra: queda cerrado con tu nota y en la auditoría.", "Write what was done. The incident is not deleted: it stays closed with your note and in the audit log."),
      plantillas: [E("Volvió atrás sola; se corrigió en un commit nuevo.", "Rolled back on its own; fixed in a new commit."), E("Falsa alarma: los números volvieron solos.", "False alarm: the numbers recovered on their own.")],
      hacer: async (m) => { const r = await incidenteCerrar(x.id, m); return r.ok ? { ok: true as const, mensaje: E(r.msg.es, r.msg.en) } : { ok: false as const, mensaje: E(r.msg.es, r.msg.en) }; } }) }] : undefined,
  })) : [{ key: "nada", icon: "check", t: E("Sin incidentes", "No incidents"), s: E("La vuelta atrás, el monitoreo y el equipo los anotan aquí con su caso del manual.", "Rollbacks, monitoring and the team log them here with their runbook case.") }] });
  const u = d.umbrales;
  B.push({ type: "rows", k: E("CUÁNDO VUELVE ATRÁS SOLA", "WHEN IT ROLLS BACK ON ITS OWN"), items: [{ key: "umb", icon: "wrench", t: E(`Vigilancia de ${u.vigilancia} min después de cambiar`, `${u.vigilancia}-minute watch after switching`),
    s: E(`5xx > ${u.p5xx} % · p95 > ${u.p95} ms · ${u.nuevos} errores nuevos · ${u.salud} fallos seguidos de /api/salud`, `5xx > ${u.p5xx} % · p95 > ${u.p95} ms · ${u.nuevos} new errors · ${u.salud} /api/salud failures in a row`),
    onClick: () => router.push("/admin/sistema/configuracion"), chev: true }] });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-despliegues={d.resumen.vueltas24 > 0 ? "vuelta" : "bien"}>
      <PanelBloques bloques={[{ type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Despliegues", "Deploys"), h1: desk ? 26 : 22,
        s: E("Cada versión que salió, si quedó sana, si volvió atrás y el OK que la dejó pasar. Nada se borra de aquí.", "Every version that went out, whether it stayed healthy, whether it rolled back and the OK that let it through. Nothing is deleted from here.") }, selectorIdioma(l, router)]} h1={desk ? 26 : 22} />
      <PestanasSistema on="despliegues" l={l} />
      <PanelBloques bloques={B} />
      <Toast t={toast} desk={desk} />
    </div>);
}
