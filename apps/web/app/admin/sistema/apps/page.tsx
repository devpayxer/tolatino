import { requerir } from "@/lib/admin";
import { estadoApps } from "@/lib/app-nativa";
import { testers, versiones } from "@/lib/beta";
import { fichaGrupo, saludApps } from "@/lib/errores/admin";
import { reportesApp } from "@/lib/reportar";
import { SistemaApps } from "../../SistemaApps";
import { SistemaAppsBeta, type DatosBeta } from "../../SistemaAppsBeta";
import type { DatosTiendas, ItemApple, ItemGoogle, Pregunta } from "../../SistemaAppsTiendas";

/* 8a · Super Admin › Sistema › Apps (ADM-SYS «versiones mínimas de app»; hueco #7 del plan de la Fase 8): las cuatro apps con sus ids, la
   pausa de emergencia, el build mínimo y el de aviso por plataforma (límites, motivo y auditoría) y las sesiones activas por app y versión
   (sin personas). Ver: apps:ver (Admin, Soporte, Solo lectura); cambiar: solo un Admin (lo revisa cada acción).
   8f · Y el resto de Sistema › Apps (?v=): Versiones, Testers, Salud › Errores (?g= la ficha de un grupo; ?app, ?estado, ?tipo, ?c el cursor) y
   Reportes (los casos «Reportar un problema»; el texto del caso solo con sop:ver).
   8i · Fichas y revisión (?v=fichas), Lo que te toca (?v=toca) y Declaraciones (?v=declaraciones&app=). */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [s, sp] = await Promise.all([requerir("apps", "ver"), searchParams]);
  const editar = s.puede("apps", "editar");
  let d: DatosBeta | null = null;
  // 8h · Versiones en vivo: los builds del CI, los pedidos («Pedir un build») y qué llaves de la tubería faltan.
  if (sp.v === "versiones") { const [builds, tuberia] = await Promise.all([versiones(), (await import("@/lib/tiendas/tuberia")).estadoTuberia()]); d = { v: "versiones", builds, tuberia }; }
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
  // 8i · Lo de las tiendas: fichas y cuentas de revisión, lo que le toca al fundador y las declaraciones lado a lado.
  if (sp.v === "fichas" || sp.v === "toca" || sp.v === "declaraciones") {
    const { SistemaAppsTiendas } = await import("../../SistemaAppsTiendas");
    let t: DatosTiendas;
    if (sp.v === "fichas") t = { v: "fichas", e: await (await import("@/lib/tiendas/fichas")).estadoFichas() };
    else if (sp.v === "toca") t = { v: "toca", paquetes: await (await import("@/lib/tiendas/paquete")).loQueTeToca() };
    else {
      const app = ["cliente", "negocio", "delivery", "checkin"].includes(sp.app ?? "") ? sp.app! : "cliente";
      const [SAL, DECL, INV, { urlsTienda }] = await Promise.all([import("../../../../../mobile/tiendas/privacidad/salidas.json"), import("../../../../../mobile/tiendas/declaraciones.json"),
        import("../../../../../mobile/inventario-datos.json"), import("@/lib/tiendas/fichas")]);
      const S = SAL.default as unknown as { apple: Record<string, ItemApple[]>; google: Record<string, ItemGoogle[]> };
      t = { v: "declaraciones", app, apple: S.apple[app] ?? [], google: S.google[app] ?? [], preguntas: DECL.default.preguntas as Pregunta[],
        etiquetas: Object.fromEntries(INV.default.categorias.map((c) => [c.key, c.label])), urls: urlsTienda() };
    }
    return <SistemaAppsTiendas d={t} editar={s.role === "admin" && editar} />;
  }
  const e = await estadoApps();
  return <SistemaApps {...e} admin={s.role === "admin" && s.puede("apps", "editar")} />;
}
