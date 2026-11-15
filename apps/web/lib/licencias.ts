import "server-only";
import { cfgSql } from "./config";
import { db } from "./db";
import type { Lang } from "./idioma";

/* Licencia (APP-NEG-LICENCIA): lo que la licencia le permite al negocio, quién la emitió y cómo verificarla en el
   registro oficial. El texto, el emisor y el enlace al registro salen del catálogo (license_kinds), nunca del dueño.
   Se muestra con su estado real (en revisión, verificada, vencida, no aparece); las retiradas no salen. */
type Bi = { es: string; en: string };
export type LicFila = {
  id: string; kind: string; status: "review" | "valid" | "expired" | "not_found" | "revoked" | "withdrawn"; title: Bi; can: Bi; cannot: Bi | null;
  issuer: Bi; site: string; url: string; label: string; number: string | null; checked: string | null; next: string | null; sort: number;
  member: string | null; who: string | null; // licencia de una persona del equipo (4h-3: Doctores y Profesionales)
};
const FILAS = `select l.id::text, l.kind, l.status, coalesce(nullif(l.title, '{}'::jsonb), k.title) as title, k.can, k.cannot, k.issuer, k.registry_site as site,
                      k.registry_url as url, k.number_label as label, l.number, l.checked_at as checked, l.next_review as next, l.sort,
                      l.member_id::text as member, m.display_name as who
                 from licenses l join license_kinds k on k.key = l.kind left join business_members m on m.id = l.member_id`;

export async function licenciasDe(businessId: string): Promise<LicFila[]> {
  return (await db().query<LicFila>(`${FILAS} where l.business_id = $1 and l.member_id is null and l.status <> 'withdrawn' order by l.sort, l.created_at`, [businessId])).rows;
}
/* Las licencias de cada persona del equipo (solo las que siguen en el equipo). */
export async function licenciasEquipo(businessId: string): Promise<LicFila[]> {
  return (await db().query<LicFila>(`${FILAS} where l.business_id = $1 and l.member_id is not null and m.status = 'active' and l.status <> 'withdrawn' order by m.sort, l.sort, l.created_at`, [businessId])).rows;
}
/* Todas (negocio y equipo): lo que revisa el Super Admin. */
export async function licenciasTodas(businessId: string): Promise<LicFila[]> {
  return (await db().query<LicFila>(`${FILAS} where l.business_id = $1 and l.status <> 'withdrawn' order by l.member_id nulls first, l.sort, l.created_at`, [businessId])).rows;
}

export async function licenciaPagina(id: string, lang: Lang) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return null;
  const b = (await db().query<{ id: string; name: string; cant: [string, string] | null }>(
    `select b.id, b.name, case when jsonb_typeof(b.category_attrs->'cant') = 'array' then b.category_attrs->'cant' end as cant
       from businesses b where b.id = $1 and b.status = 'active'`, [id])).rows[0];
  if (!b) return null;
  const lic = await licenciasDe(id);
  if (!lic.length) return null;
  const es = lang === "es";
  return { id: b.id, nombre: b.name, cant: b.cant ? b.cant[es ? 0 : 1] : null, licencias: lic };
}

/* Tarjeta «¿PUEDE HACERLO POR LEY?» de la ficha (Pro): la primera licencia con su título y lo que pueden todas;
   sin licencias pero con «lo que no hace», la tarjeta «LO QUE NO HACE» sin enlace. */
export function tarjetaLey(lic: LicFila[], cant: string | null, lang: Lang) {
  const L = (x: Bi | null) => (x ? x[lang] || x.es : "");
  if (lic.length) return { titulo: L(lic[0]!.title), texto: lic.map((x) => L(x.can)).join(" "), cant, enlace: true };
  return cant ? { titulo: cant, texto: "", cant: null, enlace: false } : null;
}

/* 4ig · La licencia verificada cuya revisión vence en `lic_aviso_dias` (14) o ya venció vuelve a la cola «Licencias» para mirarla otra vez en el
   registro oficial (vencida = prioridad alta). Nadie la marca vencida sin mirar: el sello sigue a la licencia `valid` hasta que una persona
   decide. Un caso abierto por licencia (queue_items_abierto_idx); verificarla otra vez mueve la revisión 3 meses.
   9n-7 (15 nov) · Empezó con Iglesias, Bienes Raíces y Autos (4ig); ahora cubre TODAS las categorías con licencia (Salud, Profesionales,
   Niños, Educación, Transporte, Fiestas, Noche…): sin lista de categorías, ninguna se queda sin volver a revisión (guardián licenciasVuelvenTodas). */
export async function barrerLicencias() {
  const r = await db().query(
    `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
     select 'lic', 'license', l.id::text, l.business_id, l.city_id, case when l.next_review < current_date then 'alta' else 'normal' end
       from licenses l join businesses b on b.id = l.business_id
      where l.status = 'valid' and l.next_review is not null and l.next_review <= current_date + ${cfgSql("lic_aviso_dias")} and b.status = 'active'
     on conflict do nothing`);
  return { abiertas: r.rowCount ?? 0 };
}
