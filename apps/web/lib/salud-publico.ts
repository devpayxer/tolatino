import "server-only";
import { db } from "./db";
import { misSeguros, type Seguro } from "./mis-seguros";
import type { CatSeguro, Clinica } from "./salud-compat";
import { herramientaSP } from "./salud-pro";
import type { HerrSalud } from "./salud-pro-comun";

/* La ficha de un consultorio (4i · fase4-salud-pro.md §4i): servicios con su forma de cobrar, quién atiende (solo con
   licencia VERIFICADA), los seguros que acepta, el precio sin seguro, la espera sin cita y «Tu seguro» de la persona.
   Lo calcula el servidor; el cliente solo muestra (la compatibilidad se recalcula al pedir la cita). */
type Bi = { es: string; en: string };
export type SvcPub = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; dur: number; k: string; esc: boolean; rem: boolean; no: Bi[]; foto: string | null; who: string[] };
export type ProfPub = { id: string; nombre: string; rol: Bi | null; foto: string | null; langs: string[]; lic: Bi };
export type SaludPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  secciones: { id: string; name: Bi }[]; servicios: SvcPub[]; gente: ProfPub[];
  clinica: Clinica; h: Omit<HerrSalud, "cat">; espera: { min: number; hace: number } | null; tags: string[];
  cat: CatSeguro[]; segs: Seguro[]; sesion: boolean; can: boolean; booking: boolean;
};

export async function saludPublico(negocio: string, userId: string | null): Promise<SaludPublico | null> {
  const b = (await db().query<{ id: string; name: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; fv: string[]; cat: string }>(
    `select b.id, b.name, b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_on as mods, b.modules_off as off, b.filter_values as fv, b.category_id as cat
       from businesses b where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-SALUD") return null;
  const off = b.off ?? {};
  if (off.svc) return null;
  const [S, I, G, H, C, segs] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<SvcPub>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.duration_min, 30) as dur,
              coalesce(i.svc_kind, 'cons') as k, coalesce((i.svc_attrs->>'esc')::boolean, false) as esc, coalesce((i.svc_attrs->>'rem')::boolean, false) as rem,
              coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, i.photos[1] as foto,
              coalesce((select array_agg(s.member_id::text) from staff_services s where s.item_id = i.id), '{}') as who
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]),
    // ¿Con quién?: solo profesionales del equipo con licencia verificada (recepción sale en Staff, no aquí).
    db().query<ProfPub>(
      `select m.id::text, m.display_name as nombre, m.role as rol, m.photo_url as foto, m.languages as langs,
              (select coalesce(nullif(l.title, '{}'::jsonb), k.title) from licenses l join license_kinds k on k.key = l.kind where l.member_id = m.id and l.status = 'valid' order by l.sort limit 1) as lic
         from business_members m where m.business_id = $1 and m.status = 'active' and m.show_on_page and m.hidden_by_admin is null and m.takes_bookings
          and exists (select 1 from licenses l where l.member_id = m.id and l.status = 'valid') order by m.sort, m.id`, [negocio]),
    herramientaSP(negocio, "salud"),
    db().query<{ wait: number | null; hace: number | null }>(`select walk_wait_min as wait, (extract(epoch from now() - walk_wait_at) / 60)::int as hace from health_settings where business_id = $1`, [negocio]),
    userId ? misSeguros(userId) : Promise.resolve([] as Seguro[]),
  ]);
  if (!H || H.rubro !== "salud" || !I.rows.length) return null;
  const { cat: cat0, ...h } = H;
  const planes = (await db().query<{ key: string; plans: { key: string; name: Bi }[] }>(`select key, plans from insurers where key = any($1)`, [cat0.map((x) => x.key)])).rows;
  const cat: CatSeguro[] = cat0.map((x) => ({ ...x, plans: planes.find((p) => p.key === x.key)?.plans ?? [] }));
  const w = C.rows[0];
  // La espera sin cita solo se muestra si la actualizaron hace menos de 3 horas (si no, no se inventa).
  const espera = h.walk && w?.wait != null && w.hace != null && w.hace <= 180 ? { min: w.wait, hace: w.hace } : null;
  const usados = new Set(I.rows.map((s) => s.sec));
  return {
    negocio: { id: b.id, nombre: b.name, direccion: b.address, telefono: b.phone, foto: b.foto },
    secciones: S.rows.filter((s) => usados.has(s.id)), servicios: I.rows, gente: G.rows,
    clinica: { ins: h.ins, sin: h.sin, cash: h.cash, escala: h.escala }, h, espera, tags: b.fv ?? [], cat, segs, sesion: !!userId,
    can: (b.mods ?? []).includes("citas") && !off.citas && h.nuevos,
    // 4j: el Booking de Doctores (/n/{id}/consulta) cuando el consultorio toma citas en línea.
    booking: (b.mods ?? []).includes("citas") && !off.citas && h.nuevos,
  };
}
