"use client";
/* ADM-SYS · pestañas de Sistema: Equipo y permisos · Configuración (5i). */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";

export function PestanasSistema({ on }: { on: "equipo" | "cfg" }) {
  const router = useRouter();
  return <PanelBloques bloques={[{ type: "tabs", items: [
    { l: "Equipo y permisos", on: on === "equipo", onClick: () => router.push("/admin/sistema") },
    { l: "Configuración", on: on === "cfg", onClick: () => router.push("/admin/sistema/configuracion") },
  ] }]} />;
}
