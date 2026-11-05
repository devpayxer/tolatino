import { AdminRow } from "@tolatino/ui";
import Link from "next/link";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import {Titulo } from "../ui";

/* ADM-CAT · Catálogo (Fase 0: lectura). Editar subcategorías, sinónimos y filtros con «afecta a N negocios» entra en la Fase 1. */
export default async function Catalogo({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requerir("cat", "ver");
  const { c } = await searchParams;
  if (c && /^NEG-[A-Z]+$/.test(c)) {
    const [cat, subs] = await Promise.all([
      db().query<{ name: string; icon: string }>(`select name->>'es' as name, icon from categories where id = $1`, [c]),
      db().query<{ id: string; es: string; en: string; status: string }>(`select id, name->>'es' as es, name->>'en' as en, status from subcategories where category_id = $1 order by sort`, [c]),
    ]);
    return (
      <>
        <Link href="/admin/catalogo" className="text-[13px] font-bold">← Catálogo</Link>
        <Titulo eyebrow={`SUPER ADMIN · CATÁLOGO · ${c}`} titulo={cat.rows[0]?.name ?? c} sub={`${subs.rows.length} subcategorías`} />
        <div className="flex flex-col gap-1.5">
          {subs.rows.map((s) => <AdminRow key={s.id} title={s.es} sub={s.es === s.en ? s.id : `${s.en} · ${s.id}`} tag={s.status === "off" ? "APAGADA" : undefined} padding="10px 14px" />)}
        </div>
      </>
    );
  }
  const r = await db().query<{ id: string; name: string; short: string; icon: string; subs: number; status: string; mods: string[] }>(
    `select c.id, c.name->>'es' as name, c.short->>'es' as short, c.icon, c.status,
            (select count(*)::int from subcategories s where s.category_id = c.id and s.status = 'on') as subs,
            array(select jsonb_array_elements_text(c.allowed_modules)) as mods
       from categories c order by c.sort`,
  );
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · CATÁLOGO" titulo="17 categorías" sub={`${r.rows.reduce((a, x) => a + x.subs, 0)} subcategorías, sacadas de la taxonomía aprobada.`} />
      <div className="flex flex-col gap-2">
        {r.rows.map((x) => (
          <Link key={x.id} href={`/admin/catalogo?c=${x.id}`} className="text-ink hover:text-ink">
            <AdminRow icon={x.icon} title={x.name} sub={`${x.subs} subcategorías · módulos: ${x.mods.join(", ")}`} tag={x.short.toUpperCase()} chevron />
          </Link>
        ))}
      </div>
    </>
  );
}
