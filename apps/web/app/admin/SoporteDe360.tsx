"use client";
/* 7b · Usuarios 360° › Soporte y Negocios 360° › Soporte: los casos con To'Latino (número, tema, estado, cuándo) que llevan a su ficha en
   Super Admin › Soporte. Solo quien ve Soporte (sop:ver) recibe la pestaña. */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { ESTADO_EQUIPO, TEMAS, type Tema } from "@/lib/soporte-comun";

export type CasoSop = { num: string; tema: Tema; status: string; priority: string; at: string; titulo: string };
const fecha = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");

export function SoporteDe360({ casos, vacio }: { casos: CasoSop[]; vacio: string }) {
  const router = useRouter();
  return <PanelBloques bloques={casos.length ? [{ type: "rows", k: `CASOS DE SOPORTE · ${casos.length}`, items: casos.map((c) => ({
    key: c.num, icon: "chat", t: `${c.num} · ${TEMAS[c.tema]?.corto.es ?? c.tema}`, s: c.titulo || "(sin texto)", m: `${(ESTADO_EQUIPO[c.status]?.es ?? c.status).toUpperCase()} · ${fecha(c.at).toUpperCase()}`,
    tag: c.priority === "alta" ? "ALTA" : null, tone: "danger", chev: true, onClick: () => router.push(`/admin/soporte?caso=${c.num}`) })) }]
    : [{ type: "note", tone: "info", icon: "chat", t: vacio }]} />;
}
