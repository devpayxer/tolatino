"use client";
/* 9j · Super Admin › Sistema › Respaldos (prototipo secSys «backup»; hueco #3: la restauración de prueba arriba, porque lo que importa es que
   restaura; lib/sistema/respaldos.ts). Solo lectura. En el sandbox, lo que hay es la semilla de pruebas: los respaldos reales nacen con producción
   (9o) y la pantalla lo dice. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { DatosRespaldos, Tipo } from "@/lib/sistema/respaldos";
import { ATRASO_H, SIN_RESTAURAR_DIAS } from "@/lib/sistema/respaldos-comun";
import { useAncho } from "./Colas";
import { PestanasSistema } from "./sistema/Pestanas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export function SistemaRespaldos({ d, l }: { d: DatosRespaldos; l: L }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const TIPO: Record<Tipo, [string, string, string]> = {
    base: ["Base completa", "Full database", "folder"], wal: ["Registro continuo (WAL)", "Continuous log (WAL)", "clock"],
    fotos: ["Fotos y archivos", "Photos and files", "image"], sobre: ["Sobre de llaves de recuperación", "Recovery key envelope", "key"],
  };
  const tam = (b: number | null) => (b == null ? "—" : b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
  const dur = (s: number | null) => (s == null ? "—" : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.round(s / 60)} min`);
  const ult = d.simulacros[0];
  const B: Bloque[] = [];
  if (d.entorno !== "produccion") B.push({ type: "note", tone: "ink", icon: "info", t: E("Sandbox: lo que ves es la semilla de pruebas. Los respaldos reales (pgBackRest, fotos y el sobre de llaves, a otra región) y la restauración de prueba de cada semana nacen cuando se encienda producción.",
    "Sandbox: what you see is the test seed. Real backups (pgBackRest, photos and the key envelope, to another region) and the weekly test restore are born when production is turned on.") });
  if (d.atrasado) B.push({ type: "note", tone: "danger", icon: "warning", t: E(`Respaldo atrasado: la base no tiene un respaldo bueno en ${d.horasBase == null ? "ningún momento" : `${d.horasBase} h`} (el límite es ${ATRASO_H} h).`, `Backup overdue: the database has no good backup in ${d.horasBase == null ? "any time" : `${d.horasBase} h`} (the limit is ${ATRASO_H} h).`) });
  if (d.restauracionFallo) B.push({ type: "note", tone: "danger", icon: "warning", t: E("La última restauración de prueba falló. Hasta que una restaure bien, no se da por bueno ningún respaldo.", "The latest test restore failed. Until one restores well, no backup counts as good.") });
  if (d.sinRestaurar) B.push({ type: "note", tone: "warn", icon: "clock", t: E(`Sin una restauración de prueba buena en ${SIN_RESTAURAR_DIAS} días.`, `No good test restore in ${SIN_RESTAURAR_DIAS} days.`) });
  B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
    { k: E("ÚLTIMA RESTAURACIÓN", "LATEST RESTORE"), v: ult ? (ult.result === "ok" ? E("RESTAURÓ", "RESTORED") : E("FALLÓ", "FAILED")) : "—", s: ult ? cuando(ult.at) : E("ninguna todavía", "none yet"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    { k: E("RTO MEDIDO", "MEASURED RTO"), v: dur(ult?.rto ?? null), s: E("objetivo: 1 h", "target: 1 h") },
    { k: E("ÚLTIMO RESPALDO DE LA BASE", "LATEST DATABASE BACKUP"), v: d.horasBase == null ? "—" : E(`hace ${d.horasBase} h`, `${d.horasBase} h ago`), s: E(`límite ${ATRASO_H} h`, `limit ${ATRASO_H} h`) },
    { k: E("PÉRDIDA MÁXIMA", "MAX DATA LOSS"), v: "5 min", s: E("objetivo (WAL continuo)", "target (continuous WAL)") },
  ] });
  B.push({ type: "rows", k: E("RESTAURACIONES DE PRUEBA", "TEST RESTORES"), items: d.simulacros.length ? d.simulacros.map((x) => ({
    key: x.id, icon: x.result === "ok" ? "check" : "warning", t: `${cuando(x.at)} · RTO ${dur(x.rto)}`,
    s: `${x.punto ? `${E("punto", "point")} ${cuando(x.punto)} · ` : ""}${Object.entries(x.checks).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(" · ")}${x.detail ? ` · ${x.detail}` : ""}`,
    tag: x.result === "ok" ? E("RESTAURÓ", "RESTORED") : E("FALLÓ", "FAILED"), tone: x.result === "ok" ? "signal" : "danger" }))
    : [{ key: "nada", icon: "clock", t: E("Todavía no hay restauraciones de prueba", "No test restores yet"), s: E("Cada semana se restaura el último respaldo en una máquina aparte y se anota aquí.", "Every week the latest backup is restored on a separate machine and logged here.") }] });
  B.push({ type: "rows", k: E("LO ÚLTIMO DE CADA TIPO", "LATEST OF EACH KIND"), cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: (Object.keys(TIPO) as Tipo[]).map((k) => {
    const x = d.ultimos[k];
    return { key: k, icon: TIPO[k][2], t: E(TIPO[k][0], TIPO[k][1]), s: x ? `${cuando(x.at)} · ${tam(x.bytes)}${x.destino ? ` · ${x.destino}` : ""}${x.detail ? ` · ${x.detail}` : ""}` : E("Ninguno todavía", "None yet"),
      tag: !x ? E("SIN DATOS", "NO DATA") : x.result === "ok" ? E("BIEN", "OK") : E("FALLÓ", "FAILED"), tone: !x ? "neutral" : x.result === "ok" ? "signal" : "danger" };
  }) });
  B.push({ type: "rows", k: E("RESPALDOS · LOS ÚLTIMOS 20", "BACKUPS · LATEST 20"), items: d.lista.map((x) => ({ key: x.id, icon: TIPO[x.kind][2], t: `${E(TIPO[x.kind][0], TIPO[x.kind][1])} · ${cuando(x.at)}`,
    s: `${tam(x.bytes)}${x.sha ? ` · sha256 ${x.sha.slice(0, 12)}…` : ""}${x.prueba ? ` · ${E("prueba", "test")}` : ""}${x.detail ? ` · ${x.detail}` : ""}`,
    tag: x.result === "ok" ? E("BIEN", "OK") : E("FALLÓ", "FAILED"), tone: x.result === "ok" ? "signal" : "danger", compact: true })) });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-respaldos={d.atrasado ? "atrasado" : d.restauracionFallo ? "fallo" : "bien"}>
      <PanelBloques bloques={[{ type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Respaldos", "Backups"), h1: desk ? 26 : 22,
        s: E("Lo que importa es que restaura: la restauración de prueba va primero. Nada se borra de aquí.", "What matters is that it restores: the test restore comes first. Nothing is deleted from here.") }, selectorIdioma(l, router)]} h1={desk ? 26 : 22} />
      <PestanasSistema on="respaldos" l={l} />
      <PanelBloques bloques={B} />
    </div>);
}
