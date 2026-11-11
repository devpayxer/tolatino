"use client";
/* ADM-SYS · pestañas de Sistema: Equipo y permisos · Configuración (5i) · Apps e Integraciones (8a). */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";

export type PestanaSistema = "equipo" | "cfg" | "apps" | "integ";
export const PESTANAS_SISTEMA: { k: PestanaSistema; l: string; href: string }[] = [
  { k: "equipo", l: "Equipo y permisos", href: "/admin/sistema" },
  { k: "cfg", l: "Configuración", href: "/admin/sistema/configuracion" },
  { k: "apps", l: "Apps", href: "/admin/sistema/apps" },
  { k: "integ", l: "Integraciones", href: "/admin/sistema/integraciones" },
];
export function PestanasSistema({ on }: { on: PestanaSistema }) {
  const router = useRouter();
  return <PanelBloques bloques={[{ type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: on === p.k, onClick: () => router.push(p.href) })) }]} />;
}
