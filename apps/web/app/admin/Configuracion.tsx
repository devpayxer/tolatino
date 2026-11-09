"use client";
/* 5i · Super Admin › Sistema › Configuración (Super Admin.dc.html secSys sub «cfg»; hueco #10 del plan de la Fase 5): los valores de
   config_keys por sección, cada uno con su unidad, su valor de fábrica y sus límites; «CAMBIADO» si no es el de fábrica. Tocar una fila
   (solo un Admin) pide el valor nuevo y el motivo; el servidor revisa los límites y deja la auditoría antes → después. Lo que todavía no
   se cambia aquí (un texto que ve la persona dice el número) se ve con su motivo; lo que se cambia en otra pantalla, con «Ir». */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FilaConfig, Seccion } from "@/lib/config";
import { configCambiar } from "./acciones-config";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

const SECCION: Record<Seccion, string> = {
  comunidad: "COMUNIDAD", gamificacion: "GAMIFICATION", salud_pro: "DOCTORES Y PROFESIONALES", noche: "NOCHE", edu: "EDUCACIÓN · NIÑOS · DEPORTE", fe_inm_autos: "IGLESIAS · BIENES RAÍCES · AUTOS", eventos: "EVENTOS",
};
const fmt = (f: { key: string; unidad: { es: string } }, v: number) => (f.key.endsWith("_cents") ? `$${(v / 100).toFixed(2)}` : `${v.toLocaleString("en-US")} ${f.unidad.es}`);
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function Configuracion({ filas, admin, autoOcultar }: { filas: FilaConfig[]; admin: boolean; autoOcultar: { reportes: number; horas: number } | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Guardado."); setConf(null); router.refresh(); };
  const tabs: Bloque = { type: "tabs", items: [{ l: "Equipo y permisos", on: false, onClick: () => router.push("/admin/sistema") }, { l: "Configuración", on: true, onClick: () => undefined }] };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA", t: "Configuración", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const editar = (f: FilaConfig) => {
    if (f.editIn) return router.push(f.editIn);
    if (!f.editable) return setToast(`Todavía no se cambia aquí: ${f.bloqueo?.es ?? ""}`);
    if (!admin) return setToast("Solo un Admin cambia la configuración.");
    setConf({
      titulo: f.label.es, cta: "Guardar",
      sub: `Ahora: ${fmt(f, f.v)} · de fábrica: ${fmt(f, f.def)} · de ${fmt(f, f.min)} a ${fmt(f, f.max)}. Aplica desde ahora en todas las ciudades. El motivo queda en la auditoría.`,
      valor: { k: `VALOR NUEVO (${f.unidad.es.toUpperCase()})`, ini: String(f.v), max: 7 },
      plantillas: ["Lo pidió el fundador", "Ajuste con datos reales", "Volver al de fábrica"],
      hacer: (m, _e, v) => configCambiar(f.key, v, m),
    });
  };
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Configuración", s: "Plazos y límites de la plataforma, cada uno con sus límites. Cambiar un valor aplica a todas las ciudades y queda en la auditoría con antes → después.", h1: desk ? 26 : 22 },
    tabs,
    { type: "note", tone: "info", icon: "info", t: `Moneda: USD · Hora: la de cada ciudad. ${admin ? "Toca un valor para cambiarlo." : "Solo un Admin cambia la configuración."}` },
  ];
  for (const sec of Object.keys(SECCION) as Seccion[]) {
    const L = filas.filter((f) => f.seccion === sec);
    if (!L.length) continue;
    B.push({ type: "group", k: SECCION[sec] });
    const items: { key: string; icon: string; t: string; r: string; s: string; tag: string | null; tone: string; dim: boolean; chev: boolean; onClick: () => void }[] = L.map((f) => ({
      key: f.key as string, icon: f.editable ? "edit" : "lock", t: desk ? f.label.es : `${f.label.es} · ${fmt(f, f.v)}`, r: desk ? fmt(f, f.v) : "",
      s: [f.help?.es, f.editable ? `De fábrica ${fmt(f, f.def)} · de ${fmt(f, f.min)} a ${fmt(f, f.max)}` : `No se cambia todavía: ${f.bloqueo?.es ?? ""}`, f.editIn ? "Se cambia en su pantalla" : null,
        f.at ? `Último cambio: ${f.quien ?? "equipo"} · ${cuando(f.at)}` : null].filter(Boolean).join(" · "),
      tag: f.cambiado ? "CAMBIADO" : !f.editable ? "SOLO LECTURA" : null, tone: f.cambiado ? "action" : "neutral", dim: !f.editable,
      chev: f.editable && (admin || !!f.editIn), onClick: () => editar(f),
    }));
    if (sec === "comunidad" && autoOcultar) items.push({ key: "autohide", icon: "shield", t: desk ? "Auto-ocultar por reportes" : `Auto-ocultar por reportes · ${autoOcultar.reportes} en ${autoOcultar.horas} h`, r: desk ? `${autoOcultar.reportes} en ${autoOcultar.horas} h` : "",
      s: "Es un parámetro de su regla: se cambia en Contenido › Auto-moderación, junto con el interruptor de la regla.", tag: null, tone: "neutral", dim: false, chev: true, onClick: () => router.push("/admin/contenido?tab=auto") });
    B.push({ type: "rows", cols: desk ? "repeat(auto-fill,minmax(420px,1fr))" : "1fr", items });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
