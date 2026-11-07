import "server-only";
import type { GrupoNav } from "@/app/admin/ui";
import { db } from "./db";

/* Lo que ya existe en la Fase 0; el resto se ve en el menú con su fase (nada de botones muertos). */
export const HECHAS: Record<string, string> = { home: "/admin", cont: "/admin/contenido", tx: "/admin/transacciones", sop: "/admin/colas?cola=sop", colas: "/admin/colas", neg: "/admin/negocios", usr: "/admin/usuarios", analit: "/admin/analitica", ciud: "/admin/ciudades", cat: "/admin/catalogo", sys: "/admin/sistema", notif: "/admin/notificaciones", plan: "/admin/planes", conf: "/admin/confianza" };
export const FASE: Record<string, string> = {
  tx: "Fase 2", sop: "Fase 2", plan: "Fase 2", notif: "Fase 2",
  cont: "Fase 2", gam: "Fase 5", evt: "Fase 6", mkt: "Fase 9", cms: "Fase 9",
};
const GRUPOS: Record<string, string> = { operar: "Operar", contenido: "Contenido y oferta", dinero: "Dinero y crecimiento", control: "Control" };

export async function gruposNav(puede: (s: string) => boolean): Promise<GrupoNav[]> {
  const r = await db().query<{ key: string; name: string; grp: string; icon: string }>("select key, name->>'es' as name, grp, icon from admin_sections order by sort");
  return Object.entries(GRUPOS)
    .map(([k, label]) => ({
      label,
      items: r.rows
        .filter((s) => s.grp === k && puede(s.key))
        .map((s) => ({ key: s.key, label: s.name, icon: s.icon, href: HECHAS[s.key] ?? null, fase: FASE[s.key] })),
    }))
    .filter((g) => g.items.length);
}

