import { requerir } from "@/lib/admin";
import { estadoApps } from "@/lib/app-nativa";
import { SistemaApps } from "../../SistemaApps";

/* 8a · Super Admin › Sistema › Apps (ADM-SYS «versiones mínimas de app»; hueco #7 del plan de la Fase 8): las cuatro apps con sus ids, la
   pausa de emergencia, el build mínimo y el de aviso por plataforma (límites, motivo y auditoría) y las sesiones activas por app y versión
   (sin personas). Ver: apps:ver (Admin, Soporte, Solo lectura); cambiar: solo un Admin (lo revisa cada acción). */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("apps", "ver");
  const e = await estadoApps();
  return <SistemaApps {...e} admin={s.role === "admin" && s.puede("apps", "editar")} />;
}
