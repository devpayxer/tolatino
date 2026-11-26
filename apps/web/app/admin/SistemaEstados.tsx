"use client";
/* 9j · Super Admin › Sistema › Estados (prototipo secSys «states», sysMore L1652–1661): los 9 estados que cubre toda pantalla del admin, con las
   piezas reales del sistema (PanelBloques), y los de Sistema de la Fase 9 (fase9-apertura.md §5). Es una referencia: las acciones de ejemplo no
   cambian nada y lo dicen. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PestanasSistema } from "./sistema/Pestanas";
import { par, selectorIdioma, type L } from "./TextosComun";

export function SistemaEstados({ l }: { l: L }) {
  const { E2 } = par(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [lote, setLote] = useState(false);
  const demo = E2("Demostración: no cambia nada.", "Demo: nothing changes.");
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SISTEMA · ESTADOS", "SYSTEM · STATES"), t: E2("Estados", "States"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setToast(r.mensaje ?? demo); setConf(null); }} />
      <Toast t={toast} desk={desk} />
    </div>);
  const g = (n: string, t: string): Bloque => ({ type: "group", k: `${n} · ${t}` });
  const B: Bloque[] = [
    { type: "note", tone: "ink", icon: "grid", t: E2("Los 9 estados que cubre toda pantalla del admin, con las piezas reales. Las secciones los usan cuando pasa de verdad.", "The 9 states every admin screen covers, with the real pieces. Sections use them when it really happens.") },
    g("1", E2("CARGA", "LOADING")), { type: "kpis", cols: "repeat(2,minmax(0,1fr))", items: [{ k: E2("CARGANDO", "LOADING"), v: "···" }, { k: E2("CARGANDO", "LOADING"), v: "···" }] },
    { type: "rows", items: [{ key: "c", icon: "clock", t: E2("Cargando la cola…", "Loading the queue…"), s: E2("Las colas se leen cada 30 s.", "Queues refresh every 30 s.") }] },
    g("2", E2("VACÍO", "EMPTY")), { type: "empty", icon: "check", t: E2("No hay nada en esta cola", "Nothing in this queue"), s: E2("Cuando llegue algo, aparece aquí.", "When something arrives, it shows here.") },
    g("3", E2("SIN RESULTADOS", "NO RESULTS")), { type: "empty", icon: "search", t: E2("Nada con «pupusas veganas»", "Nothing for «pupusas veganas»"), s: E2("Prueba con menos palabras o quita un filtro.", "Try fewer words or remove a filter."), cta: E2("Quitar filtros", "Clear filters"), onCta: () => setToast(demo) },
    g("4", "ERROR"), { type: "note", tone: "danger", icon: "warning", t: E2("No pudimos cargar las transacciones de Stripe. Lo demás funciona.", "We could not load Stripe transactions. Everything else works."), cta: E2("Reintentar", "Retry"), onCta: () => setToast(demo) },
    g("5", E2("SIN PERMISO", "NO PERMISSION")), { type: "note", tone: "warn", icon: "lock", t: E2("Tu rol (Soporte) no entra aquí. Pídele acceso a Admin.", "Your role (Support) cannot enter here. Ask Admin for access.") },
    g("6", E2("LO ESTÁ VIENDO OTRA PERSONA", "SOMEONE ELSE IS ON IT")), { type: "note", tone: "warn", icon: "users", t: E2("Lo está viendo otra persona del equipo desde hace 3 min.", "Another team member has been on it for 3 min."), cta: E2("Tomarlo", "Take it"), onCta: () => setToast(demo) },
    g("7", E2("ACCIÓN IRREVERSIBLE", "IRREVERSIBLE ACTION")), { type: "acts", items: [{ l: E2("Banear (ejemplo)", "Ban (example)"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E2("Ejemplo: banear a un vecino", "Example: ban a neighbor"), peligro: true, cta: E2("Confirmar", "Confirm"),
      sub: E2("Motivo obligatorio con plantillas. Esto es una demostración: no cambia nada.", "Required reason with templates. This is a demo: nothing changes."), plantillas: [E2("Acoso repetido.", "Repeated harassment."), E2("Cuenta falsa.", "Fake account.")], nota: "interna", hacer: async () => ({ ok: true, mensaje: demo }) }) }] },
    g("8", E2("ACCIÓN EN LOTE", "BULK ACTION")),
    lote ? { type: "bulk", t: E2("8 seleccionados", "8 selected"), onClose: () => setLote(false), acts: [{ l: E2("Aprobar", "Approve"), icon: "check", onClick: () => { setLote(false); setToast(E2("Demostración: 6 aprobados, 2 ya los había decidido otra persona.", "Demo: 6 approved, 2 someone else had already decided.")); } }] }
      : { type: "acts", items: [{ l: E2("Correr lote de ejemplo (8)", "Run sample batch (8)"), icon: "bolt", onClick: () => setLote(true) }] },
    g("9", E2("DATO DESACTUALIZADO", "STALE DATA")), { type: "note", tone: "warn", icon: "warning", t: E2("Otra persona cambió este negocio hace 1 min mientras lo mirabas.", "Someone else changed this business 1 min ago while you were looking."), cta: E2("Actualizar", "Refresh"), onCta: () => setToast(demo) },
    { type: "group", k: E2("LOS DE SISTEMA (FASE 9)", "SYSTEM ONES (PHASE 9)") },
    { type: "rows", items: [
      { key: "f1", icon: "bolt", t: "app.reportar", s: E2("Apagado", "Off"), tag: E2("APAGADO", "OFF"), tone: "neutral" },
      { key: "f2", icon: "bolt", t: "app.reportar", s: E2("10 % en Reading", "10% in Reading"), tag: "10 %", tone: "action" },
    ] },
    { type: "note", tone: "danger", icon: "warning", t: E2("Respaldo atrasado: la base no tiene un respaldo bueno en 30 h (el límite es 26 h).", "Backup overdue: the database has no good backup in 30 h (the limit is 26 h).") },
    { type: "note", tone: "danger", icon: "warning", t: E2("La última restauración de prueba falló. Hasta que una restaure bien, no se da por bueno ningún respaldo.", "The latest test restore failed. Until one restores well, no backup counts as good.") },
    { type: "note", tone: "danger", icon: "works", t: E2("Despliegue en vuelta atrás: los errores subieron y volvió solo a la versión anterior.", "Deploy rolled back: errors went up and it returned to the previous version on its own.") },
    { type: "note", tone: "warn", icon: "clock", t: E2("Mantenimiento programado: mar 20 nov, 2–3 AM. «Estamos haciendo un cambio. Volvemos en unos minutos.»", "Scheduled maintenance: Tue Nov 20, 2–3 AM. «We are making a change. Back in a few minutes.»") },
    { type: "note", tone: "warn", icon: "lock", t: E2("Segundo factor no dado de alta: lo da de alta al entrar al Super Admin.", "Second step not set up: they set it up when entering the Super Admin.") },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E2("Estados", "States"), h1: desk ? 26 : 22,
        s: E2("Cómo se ve cada estado de una pantalla del admin.", "How each state of an admin screen looks.") }, selectorIdioma(l, router)]} h1={desk ? 26 : 22} />
      <PestanasSistema on="estados" l={l} />
      <PanelBloques bloques={B} />
      <Toast t={toast} desk={desk} />
    </div>);
}
