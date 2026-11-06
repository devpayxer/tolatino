import "server-only";
import { db } from "./db";
import type { Lang } from "./idioma";

/* Recuperar tu negocio (ONB-NEG-RECUPERAR): el negocio, cómo se comprueba (código por SMS al teléfono del negocio, o un
   documento), y el estado del reclamo de la persona. El teléfono del negocio nunca va completo al cliente. */
type Bi = { es: string; en: string };
export const DOCS: Record<string, Bi> = {
  licencia: { es: "Licencia del negocio", en: "Business license" }, servicio: { es: "Factura de luz o agua", en: "Utility bill" },
  ein: { es: "Carta del IRS con el EIN", en: "IRS letter with the EIN" }, otro: { es: "Otro documento", en: "Other document" },
};
/* (570) 5••-••34 (R:146). */
export const enmascarar = (p: string | null) => (p && /^\+1\d{10}$/.test(p) ? `(${p.slice(2, 5)}) ${p.slice(5, 6)}••-••${p.slice(10)}` : null);

export async function recuperar(id: string, userId: string | null, lang: Lang) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return null;
  const b = (await db().query<{
    id: string; name: string; address: string | null; ciudad: string; phone: string | null; owner: string | null; cover: string | null;
    rating: number | null; reviews: number; sub: string | null; verified: boolean;
  }>(
    `select b.id, b.name, b.address, c.name as ciudad, b.phone, b.owner_user_id as owner,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover,
            s.rating_avg::float as rating, coalesce(s.review_count, 0) as reviews, coalesce(s.verified, false) as verified,
            (select sc.name->>$2 from subcategorias_vivas sc where sc.id = any(b.subcategory_ids) order by array_position(b.subcategory_ids, sc.id) limit 1) as sub
       from businesses b join cities c on c.id = b.city_id left join business_stats_cache s on s.business_id = b.id
      where b.id = $1 and b.status = 'active'`, [id, lang])).rows[0];
  if (!b) return null;
  const mio = userId ? (await db().query<{ id: string; status: string; method: string; doc_kind: string | null; role: string; note: string | null; reason: string | null; created_at: string; decided_at: string | null }>(
    `select id, status, method, doc_kind, role, note, reason, created_at, decided_at from claims where business_id = $1 and user_id = $2 order by created_at desc limit 1`, [id, userId])).rows[0] ?? null : null;
  const meta = [b.reviews >= 5 && b.rating ? `★ ${b.rating.toFixed(1)}` : null, b.sub?.toUpperCase()].filter(Boolean).join(" · ");
  return {
    id: b.id, nombre: b.name, cover: b.cover, meta, verificado: b.verified, direccion: b.address ? `${b.address.replace(/, [A-Za-z ]+ PA$/, "")} · ${b.ciudad}` : b.ciudad, ciudad: b.ciudad,
    tel: enmascarar(b.phone), tieneDueno: !!b.owner && b.owner !== userId, soyDueno: !!b.owner && b.owner === userId, reclamo: mio,
  };
}
export type Recuperar = NonNullable<Awaited<ReturnType<typeof recuperar>>>;

/* «¿Cuál es tu negocio?»: hasta 4 parecidos en la ciudad (trigramas). */
export async function candidatos(q: string, ciudad: string) {
  const t = q.trim().slice(0, 80);
  if (t.length < 2) return [];
  return (await db().query<{ id: string; name: string; address: string | null; cover: string | null }>(
    `select b.id, b.name, b.address, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover
       from businesses b where b.city_id = $2 and b.status = 'active' and similarity(lower(b.name), lower($1)) > 0.3
      order by similarity(lower(b.name), lower($1)) desc limit 4`, [t, ciudad])).rows;
}
