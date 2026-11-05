import { AdminNote, KpiRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { gruposNav } from "@/lib/admin-nav";
import { Auditoria } from "./sistema/Auditoria";
import {SeccionesMovil, Titulo } from "./ui";

/* ADM-HOME · Inicio. Números reales de la base; sin datos de ejemplo. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ sin?: string }> }) {
  const { sin } = await searchParams;
  const s = await requerir("home");
  const r = await db().query<{ usuarios: number; nuevos: number; abiertas: number; proximas: number; equipo: number; acciones: number }>(
    `select (select count(*)::int from users where status <> 'deleted') as usuarios,
            (select count(*)::int from users where created_at > now() - interval '7 days') as nuevos,
            (select count(*)::int from cities where status = 'on') as abiertas,
            (select count(*)::int from cities where status = 'soon') as proximas,
            (select count(*)::int from staff_members where status = 'active') as equipo,
            (select count(*)::int from audit_entries where at > now() - interval '24 hours') as acciones`,
  );
  const k = r.rows[0]!;
  const grupos = await gruposNav((x) => s.puede(x, "ver"));
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · INICIO" titulo={`Hola, ${s.first_name}`} sub="Todo lo de aquí sale de la base real del servidor de pruebas." />
      {sin && <AdminNote tone="warn">Tu rol no tiene permiso para eso ({sin.replace(":", " · ")}). Si lo necesitas, pídeselo a un Admin.</AdminNote>}
      <KpiRow
        columns="repeat(auto-fill, minmax(min(100%, 160px), 1fr))"
        items={[
          { label: "USUARIOS", value: String(k.usuarios), sub: `${k.nuevos} nuevos en 7 días`, dark: true },
          { label: "CIUDADES", value: `${k.abiertas} abiertas`, sub: `${k.proximas} próximamente` },
          { label: "EQUIPO", value: String(k.equipo), sub: "personas activas" },
          { label: "ACCIONES 24 H", value: String(k.acciones), sub: "en la auditoría" },
        ]}
      />
      <SeccionesMovil grupos={grupos} />
      {s.puede("sys", "ver") && <Auditoria limite={8} titulo="ÚLTIMAS ACCIONES DEL EQUIPO" />}
    </>
  );
}
