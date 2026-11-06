import "server-only";
import { db } from "./db";
import { herramientaSP } from "./salud-pro";
import type { HerrPro } from "./salud-pro-comun";

/* La ficha de un profesional (4k · fase4-salud-pro.md §4k): servicios con el TOTAL (honorario + gobierno por separado), la
   licencia de la oficina y la de cada persona (solo verificadas), lo que no puede hacer y cómo trabaja (legal o no). */
type Bi = { es: string; en: string };
export type SvcPro = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; dur: number; k: string; gov: number; mes: boolean; hrs: string | null; unit: string | null; rem: boolean; cred: boolean; no: Bi[]; foto: string | null; who: string[] };
export type ProfPro = { id: string; nombre: string; foto: string | null; langs: string[]; lic: Bi | null };
export type ProPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  secciones: { id: string; name: Bi }[]; servicios: SvcPro[]; gente: ProfPro[]; h: HerrPro;
  lic: { titulo: Bi; puede: Bi } | null; cant: Bi | null; langs: string[]; booking: boolean;
};

export async function proPublico(negocio: string): Promise<ProPublico | null> {
  const b = (await db().query<{ id: string; name: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; cat: string; attrs: Record<string, unknown>; langs: string[] }>(
    `select b.id, b.name, b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_on as mods, b.modules_off as off, b.category_id as cat, b.category_attrs as attrs, b.languages as langs
       from businesses b where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-PRO" || (b.off ?? {}).svc) return null;
  const [S, I, G, L, H] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<SvcPro>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.duration_min, 30) as dur,
              coalesce(i.svc_kind, 'cons') as k, coalesce((i.svc_attrs->>'gov')::int, 0) as gov, coalesce((i.svc_attrs->>'mes')::boolean, false) as mes, i.svc_attrs->>'hrs' as hrs,
              i.svc_attrs->>'unit' as unit, coalesce((i.svc_attrs->>'rem')::boolean, false) as rem, coalesce((i.svc_attrs->>'cred')::boolean, false) as cred,
              coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, i.photos[1] as foto,
              coalesce((select array_agg(s.member_id::text) from staff_services s where s.item_id = i.id), '{}') as who
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]),
    db().query<ProfPro>(
      `select m.id::text, m.display_name as nombre, m.photo_url as foto, m.languages as langs,
              (select coalesce(nullif(l.title, '{}'::jsonb), k.title) from licenses l join license_kinds k on k.key = l.kind where l.member_id = m.id and l.status = 'valid' order by l.sort limit 1) as lic
         from business_members m where m.business_id = $1 and m.status = 'active' and m.show_on_page and m.hidden_by_admin is null and m.takes_bookings order by m.sort, m.id`, [negocio]),
    db().query<{ titulo: Bi; puede: Bi }>(
      `select coalesce(nullif(l.title, '{}'::jsonb), k.title) as titulo, k.can as puede from licenses l join license_kinds k on k.key = l.kind
        where l.business_id = $1 and l.member_id is null and l.status = 'valid' order by l.sort limit 1`, [negocio]),
    herramientaSP(negocio, "pro"),
  ]);
  if (!H || H.rubro !== "pro" || !I.rows.length) return null;
  const usados = new Set(I.rows.map((s) => s.sec));
  const cant = Array.isArray(b.attrs?.cant) ? { es: String((b.attrs.cant as string[])[0] ?? ""), en: String((b.attrs.cant as string[])[1] ?? (b.attrs.cant as string[])[0] ?? "") } : null;
  return {
    negocio: { id: b.id, nombre: b.name, direccion: b.address, telefono: b.phone, foto: b.foto },
    secciones: S.rows.filter((s) => usados.has(s.id)), servicios: I.rows, gente: G.rows.filter((p) => p.lic || !H.legal), h: H,
    lic: L.rows[0] ?? null, cant: cant && cant.es ? cant : null, langs: b.langs ?? ["es"],
    // 4l: la consulta se pide en línea (/n/{id}/tramite) cuando la oficina toma citas.
    booking: (b.mods ?? []).includes("citas") && !(b.off ?? {}).citas,
  };
}
