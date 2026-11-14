"use client";
/* ADM-SYS · pestañas de Sistema: Equipo y permisos · Configuración (5i) · Apps e Integraciones (8a) · Flags, Salud, Respaldos y Estados (9j; prototipo
   secSys) · Despliegues (9o). Las pestañas de 9j salen en el idioma del admin (cookie tl_lang, como Textos y páginas); las de antes, en español hasta «Super Admin en
   inglés» (LAUNCH). */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";

export type PestanaSistema = "equipo" | "cfg" | "apps" | "integ" | "flags" | "salud" | "respaldos" | "despliegues" | "estados";
export const PESTANAS_SISTEMA: { k: PestanaSistema; l: string; en: string; href: string }[] = [
  { k: "equipo", l: "Equipo y permisos", en: "Team and permissions", href: "/admin/sistema" },
  { k: "cfg", l: "Configuración", en: "Settings", href: "/admin/sistema/configuracion" },
  { k: "apps", l: "Apps", en: "Apps", href: "/admin/sistema/apps" },
  { k: "integ", l: "Integraciones", en: "Integrations", href: "/admin/sistema/integraciones" },
  { k: "flags", l: "Flags", en: "Flags", href: "/admin/sistema/flags" },
  { k: "salud", l: "Salud", en: "Health", href: "/admin/sistema/salud" },
  { k: "respaldos", l: "Respaldos", en: "Backups", href: "/admin/sistema/respaldos" },
  { k: "despliegues", l: "Despliegues", en: "Deploys", href: "/admin/sistema/despliegues" },
  { k: "estados", l: "Estados", en: "States", href: "/admin/sistema/estados" },
];
export function PestanasSistema({ on, l = "es" }: { on: PestanaSistema; l?: "es" | "en" }) {
  const router = useRouter();
  return <PanelBloques bloques={[{ type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: l === "en" ? p.en : p.l, on: on === p.k, onClick: () => router.push(p.href) })) }]} />;
}
