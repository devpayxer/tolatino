import "server-only";
import type { GrupoNav } from "@/app/admin/ui";
import { db } from "./db";

/* Lo que ya existe en la Fase 0; el resto se ve en el menú con su fase (nada de botones muertos). */
export const HECHAS: Record<string, string> = { home: "/admin", cont: "/admin/contenido", tx: "/admin/transacciones", sop: "/admin/soporte", compa: "/admin/compa", colas: "/admin/colas", neg: "/admin/negocios", usr: "/admin/usuarios", analit: "/admin/analitica", ciud: "/admin/ciudades", cat: "/admin/catalogo", sys: "/admin/sistema", notif: "/admin/notificaciones", plan: "/admin/planes", conf: "/admin/confianza", gam: "/admin/gamificacion", evt: "/admin/eventos", cms: "/admin/textos", apps: "/admin/sistema/apps", integ: "/admin/sistema/integraciones", mkt: "/admin/crecimiento", dlv: "/admin/repartidores" };
export const FASE: Record<string, string> = {
  tx: "Fase 2", plan: "Fase 2", notif: "Fase 2",
  cont: "Fase 2",
};
// 9f-4 · El menú en el idioma de la persona del equipo (admin_sections.name trae es/en).
const GRUPOS: Record<string, [string, string]> = { operar: ["Operar", "Operate"], contenido: ["Contenido y oferta", "Content and listings"], dinero: ["Dinero y crecimiento", "Money and growth"], control: ["Control", "Control"] };

export async function gruposNav(puede: (s: string) => boolean, lang: "es" | "en" = "es"): Promise<GrupoNav[]> {
  const r = await db().query<{ key: string; name: string; grp: string; icon: string }>("select key, coalesce(nullif(name->>$1, ''), name->>'es') as name, grp, icon from admin_sections order by sort", [lang]);
  return Object.entries(GRUPOS)
    .map(([k, [es, en]]) => ({
      label: lang === "en" ? en : es,
      items: r.rows
        .filter((s) => s.grp === k && puede(s.key))
        .map((s) => ({ key: s.key, label: s.name, icon: s.icon, href: HECHAS[s.key] ?? null, fase: FASE[s.key] && lang === "en" ? FASE[s.key]!.replace("Fase", "Phase") : FASE[s.key] })),
    }))
    .filter((g) => g.items.length);
}

