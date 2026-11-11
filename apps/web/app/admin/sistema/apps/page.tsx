import { requerir } from "@/lib/admin";
import { estadoApps } from "@/lib/app-nativa";
import { testers, versiones } from "@/lib/beta";
import { fichaGrupo, saludApps } from "@/lib/errores/admin";
import { reportesApp } from "@/lib/reportar";
import { SistemaApps } from "../../SistemaApps";
import { SistemaAppsBeta, type DatosBeta } from "../../SistemaAppsBeta";

/* 8a · Super Admin › Sistema › Apps (ADM-SYS «versiones mínimas de app»; hueco #7 del plan de la Fase 8): las cuatro apps con sus ids, la
   pausa de emergencia, el build mínimo y el de aviso por plataforma (límites, motivo y auditoría) y las sesiones activas por app y versión
   (sin personas). Ver: apps:ver (Admin, Soporte, Solo lectura); cambiar: solo un Admin (lo revisa cada acción).
   8f · Y el resto de Sistema › Apps (?v=): Versiones, Testers, Salud › Errores (?g= la ficha de un grupo; ?app, ?estado, ?tipo, ?c el cursor) y
   Reportes (los casos «Reportar un problema»; el texto del caso solo con sop:ver). */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [s, sp] = await Promise.all([requerir("apps", "ver"), searchParams]);
  const editar = s.puede("apps", "editar");
  let d: DatosBeta | null = null;
  if (sp.v === "versiones") d = { v: "versiones", builds: await versiones() };
  else if (sp.v === "testers") d = { v: "testers", testers: s.role === "admin" && editar ? await testers() : null };
  else if (sp.v === "salud") {
    const filtro = { app: sp.app ?? null, estado: sp.estado ?? null, tipo: sp.tipo ?? null };
    const [salud, ficha] = await Promise.all([saludApps({ ...filtro, cursor: sp.c ?? null }), sp.g ? fichaGrupo(sp.g) : Promise.resolve(null)]);
    d = { v: "salud", salud, ficha, filtro };
  } else if (sp.v === "reportes") {
    const sop = s.puede("sop", "ver");
    d = { v: "reportes", reportes: (await reportesApp(s.cities)).map((r) => (sop ? r : { ...r, texto: null })), sop };
  }
  if (d) return <SistemaAppsBeta d={d} editar={s.role === "admin" && editar} />;
  const e = await estadoApps();
  return <SistemaApps {...e} admin={s.role === "admin" && s.puede("apps", "editar")} />;
}
