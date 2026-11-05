import { AdminNote, AdminRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import {Titulo } from "../ui";

/* ADM-CIUD · Ciudades (Fase 0: lectura). El asistente para abrir una ciudad entra en la Fase 9. */
export default async function Ciudades() {
  await requerir("ciud", "ver");
  const r = await db().query<{ id: string; name: string; state: string; status: string; tax: string; zips: number; espera: number; vecinos: number }>(
    `select c.id, c.name, c.state, c.status, (c.tax_rate * 100)::numeric(5,2)::text as tax, coalesce(array_length(c.zips,1),0) as zips,
            (select count(*)::int from city_waitlist w where w.city_id = c.id and w.removed_at is null) as espera,
            (select count(*)::int from users u where u.home_city_id = c.id) as vecinos
       from cities c order by c.sort`,
  );
  // «Pide tu ciudad»: lugares que todavía no son nuestros, de la lista de espera real (APP-CIUDAD).
  const pedidas = await db().query<{ n: string; veces: number; ultima: string }>(
    `select min(city_name) as n, count(*)::int as veces, to_char(max(created_at) at time zone 'America/New_York', 'YYYY-MM-DD') as ultima
       from city_waitlist where city_id is null and removed_at is null group by lower(city_name) order by veces desc, ultima desc limit 50`);
  const est: Record<string, [string, string]> = { on: ["ABIERTA", "signal"], soon: ["PRÓXIMAMENTE", "action"], off: ["CERRADA", "danger"] };
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · CIUDADES" titulo={`${r.rows.length} ciudades`} sub="Todas nacen «próximamente»: se abren el día del lanzamiento, cuando esté todo (decisión A)." />
      <AdminNote tone="info">Abrir o cerrar una ciudad (asistente de 6 pasos, regla de vecinos en espera y negocios listos) entra en la Fase 9.</AdminNote>
      <div className="flex flex-col gap-2">
        {r.rows.map((c) => (
          <AdminRow key={c.id} icon="pin" title={`${c.name}, ${c.state}`}
            sub={`Impuesto ${c.tax} % · ${c.zips} códigos postales · ${c.vecinos} vecinos · ${c.espera} en lista de espera`}
            tag={est[c.status]?.[0]} tone={est[c.status]?.[1]} />
        ))}
      </div>
      <Titulo eyebrow="PIDE TU CIUDAD" titulo={`${pedidas.rows.length} lugares pedidos`} sub="Ciudades y códigos postales que los vecinos piden y todavía no son nuestros (Avísame cuando llegue a mi zona)." />
      <div className="flex flex-col gap-2">
        {pedidas.rows.length ? pedidas.rows.map((x) => (
          <AdminRow key={x.n} icon="bell" title={x.n} sub={`${x.veces} ${x.veces === 1 ? "pedido" : "pedidos"} · último ${x.ultima}`} />
        )) : <AdminNote tone="info">Todavía nadie pidió una ciudad nueva.</AdminNote>}
      </div>
    </>
  );
}
