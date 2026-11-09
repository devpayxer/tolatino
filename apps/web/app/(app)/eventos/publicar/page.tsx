import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { formatosDe, organizadorDe } from "@/lib/evt";
import { idioma } from "@/lib/idioma";
import { valores } from "@/lib/config";
import { ubicacion } from "@/lib/ubicacion";
import { Publicar, type VistaPub } from "./Publicar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publica tu evento · To'Latino" };

/* APP-EVT-EDITAR (diseño «To'Latino Publica tu evento»): el formulario corto. Los negocios que la persona maneja (dueño o con la parte
   «evt» del equipo), los formatos de cada uno, si es Pro (Eventos es Pro, §6 #5) y si el organizador está bloqueado. Sin sesión se llena
   igual y pide entrar al enviar; sin negocio, «Mi negocio no está aquí» lleva a Publica tu negocio. */
export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const loc = await ubicacion(u);
  const cfg = await valores("evt_revision_h", "evt_fotos_max");
  let orgs: VistaPub["orgs"] = [];
  if (u) {
    const B = (await db().query<{ id: string; name: string; cat: string; addr: string | null; foto: string | null; pro: boolean; hoy: string; ciudad: string }>(
      `select b.id, b.name, b.category_id as cat, b.address as addr, coalesce(s.plan, 'free') = 'pro' as pro, c.name as ciudad,
              to_char(now() at time zone c.timezone, 'YYYY-MM-DD') as hoy,
              (select x.url from media x where x.owner_kind = 'business' and x.owner_id = b.id and x.status = 'visible' order by x.sort limit 1) as foto
         from business_members m join businesses b on b.id = m.business_id join cities c on c.id = b.city_id left join business_stats_cache s on s.business_id = b.id
        where m.user_id = $1 and m.status = 'active' and b.status not in ('merged', 'closed') and (m.kind = 'owner' or 'evt' = any(m.panel_access) or 'all' = any(m.panel_access))
        order by (m.kind = 'owner') desc, b.created_at limit 12`, [u.id])).rows;
    orgs = await Promise.all(B.map(async (b) => ({ ...b, formatos: await formatosDe(b.cat), bloqueado: (await organizadorDe(b.id)).bloqueado })));
  }
  return <Publicar v={{ lang, ciudad: loc.c.name, yo: !!u, orgs, revisionH: cfg.evt_revision_h }} />;
}
