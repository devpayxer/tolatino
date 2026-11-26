"use client";
/* 7b · Usuarios 360° › Soporte y Negocios 360° › Soporte: los casos con To'Latino (número, tema, estado, cuándo) que llevan a su ficha en
   Super Admin › Soporte. Solo quien ve Soporte (sop:ver) recibe la pestaña. */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { ESTADO_EQUIPO, TEMAS, type Tema } from "@/lib/soporte-comun";
import { useE2 } from "./idioma-admin";

export type CasoSop = { num: string; tema: Tema; status: string; priority: string; at: string; titulo: string };
const fecha = (iso: string, loc = "es-US") => new Intl.DateTimeFormat(loc, { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");

export function SoporteDe360({ casos, vacio }: { casos: CasoSop[]; vacio: string }) {
  const router = useRouter(), { E2 } = useE2(), loc = (E2("", "x") === "x" ? "en-US" : "es-US");
  return <PanelBloques bloques={casos.length ? [{ type: "rows", k: `${E2("CASOS DE SOPORTE", "SUPPORT CASES")} · ${casos.length}`, items: casos.map((c) => ({
    key: c.num, icon: "chat", t: `${c.num} · ${((t) => (t ? E2(t.es, t.en) : c.tema))(TEMAS[c.tema]?.corto)}`, s: c.titulo || E2("(sin texto)", "(no text)"), m: `${((x) => (x ? E2(x.es, x.en) : c.status))(ESTADO_EQUIPO[c.status]).toUpperCase()} · ${fecha(c.at, loc).toUpperCase()}`,
    tag: c.priority === "alta" ? E2("ALTA", "HIGH") : null, tone: "danger", chev: true, onClick: () => router.push(`/admin/soporte?caso=${c.num}`) })) }]
    : [{ type: "note", tone: "info", icon: "chat", t: vacio }]} />;
}
