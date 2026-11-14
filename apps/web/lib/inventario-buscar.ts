import "server-only";
import { db } from "./db";

/* 9m · Buscar por propiedad o por carro (L559, §6 #10): las casas y apartamentos (renta o venta) y los carros del lote de la ciudad que se ve, con sus
   filtros (recámaras, precio, año, millas, marca), desde los índices que ya tenían (property_listings renta/venta por ciudad; vehicle_listings por
   año y millas, y trigramas de marca y modelo). Solo lo que sale al público: disponible / en el lote, del negocio activo, sin ocultar por el equipo;
   la dirección exacta de una propiedad nunca sale aquí (se ve en su página y al confirmar la visita). Cursor por (precio, id): sin OFFSET. */
export type FiltroCasa = { modo: "renta" | "venta"; recamaras: number; max: number | null };
export type FiltroCarro = { desde: number | null; millas: number | null; max: number | null; marca: string | null };
export type FilaInv = { id: string; biz: string; negocio: string; titulo: string; precio: number; foto: string | null; zona: string | null;
  d: { rec?: number | null; banos?: number | null; ft2?: number | null; anio?: number; millas?: number | null } };

export async function buscarCasas(ciudad: string, f: FiltroCasa, cursor: string | null, n = 20): Promise<{ filas: FilaInv[]; mas: string | null; total: number }> {
  const col = f.modo === "renta" ? "p.rent_cents" : "p.price_cents";
  const [cp, ci] = (cursor ?? "").split("|");
  const r = await db().query<FilaInv & { total: number; beds: number; baths: string | null; sqft: number | null; kind: string }>(
    `select i.id::text, p.business_id as biz, b.name as negocio, coalesce(i.name->>'es', '') as titulo, ${col} as precio, i.photos[1] as foto,
            p.beds, p.baths::text as baths, p.sqft, p.kind, null::text as zona, count(*) over ()::int as total
       from property_listings p join items i on i.id = p.item_id join businesses b on b.id = p.business_id
      where p.city_id = $1 and p.status = 'available' and ${col} is not null and b.status = 'active' and i.removed_at is null and i.status = 'live'
        and coalesce(p.beds, 0) >= $2 and ($3::int is null or ${col} <= $3)
        and ($4::int is null or (${col}, i.id) > ($4::int, $5::bigint))
      order by ${col}, i.id limit $6`,
    [ciudad, Math.max(0, Math.min(6, f.recamaras || 0)), f.max, cp ? Number(cp) : null, ci ? Number(ci) : 0, n + 1]);
  const filas = r.rows.slice(0, n).map((x) => ({ id: x.id, biz: x.biz, negocio: x.negocio, titulo: x.titulo, precio: x.precio, foto: x.foto, zona: x.zona,
    d: { rec: x.beds, banos: x.baths ? Number(x.baths) : null, ft2: x.sqft } }));
  const u = r.rows.length > n ? filas.at(-1)! : null;
  return { filas, mas: u ? `${u.precio}|${u.id}` : null, total: r.rows[0]?.total ?? 0 };
}

export async function buscarCarros(ciudad: string, f: FiltroCarro, cursor: string | null, n = 20): Promise<{ filas: FilaInv[]; mas: string | null; total: number }> {
  const [cp, ci] = (cursor ?? "").split("|");
  const marca = f.marca ? f.marca.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().slice(0, 30) : null;
  const r = await db().query<FilaInv & { total: number; year: number; make: string; model: string; miles: number | null }>(
    `select i.id::text, v.business_id as biz, b.name as negocio, coalesce(i.name->>'es', '') as titulo, v.otd_cents as precio, i.photos[1] as foto,
            v.year, v.make, v.model, v.miles, null::text as zona, count(*) over ()::int as total
       from vehicle_listings v join items i on i.id = v.item_id join businesses b on b.id = v.business_id
      where v.city_id = $1 and v.status = 'lot' and v.otd_cents is not null and b.status = 'active' and i.removed_at is null and i.status = 'live' and i.sell
        and ($2::int is null or v.year >= $2) and ($3::int is null or v.miles <= $3) and ($4::int is null or v.otd_cents <= $4)
        and ($5::text is null or lower(v.make || ' ' || v.model) like '%' || $5 || '%')
        and ($6::int is null or (v.otd_cents, i.id) > ($6::int, $7::bigint))
      order by v.otd_cents, i.id limit $8`,
    [ciudad, f.desde, f.millas, f.max, marca || null, cp ? Number(cp) : null, ci ? Number(ci) : 0, n + 1]);
  const filas = r.rows.slice(0, n).map((x) => ({ id: x.id, biz: x.biz, negocio: x.negocio, titulo: x.titulo || `${x.year} ${x.make} ${x.model}`, precio: x.precio, foto: x.foto, zona: null,
    d: { anio: x.year, millas: x.miles } }));
  const u = r.rows.length > n ? filas.at(-1)! : null;
  return { filas, mas: u ? `${u.precio}|${u.id}` : null, total: r.rows[0]?.total ?? 0 };
}
