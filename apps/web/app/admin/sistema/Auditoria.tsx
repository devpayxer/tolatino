import { AdminNote, AuditLog } from "@tolatino/ui";
import { db } from "@/lib/db";


/* Fila de auditoría (patrón 2al): quién, qué, antes → después, motivo, cuándo. Solo lectura, siempre. */
const hace = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 1 ? "Ahora" : m < 60 ? `Hace ${m} min` : m < 1440 ? `Hace ${Math.round(m / 60)} h` : d.toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" });
};
const corto = (v: unknown) => (v == null ? undefined : typeof v === "object" ? Object.entries(v as object).map(([k, x]) => `${k}: ${x}`).join(" · ") : String(v));

export async function Auditoria({ limite = 50, titulo = "AUDITORÍA" }: { limite?: number; titulo?: string }) {
  const r = await db().query<{ id: string; at: Date; action: string; target_kind: string; target_id: string | null; before: unknown; after: unknown; reason: string | null; quien: string | null; ini: string | null }>(
    `select a.id, a.at, a.action, a.target_kind, a.target_id, a.before, a.after, a.reason,
            nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')), '') as quien,
            upper(left(coalesce(u.first_name,'?'),1) || left(coalesce(u.last_name,''),1)) as ini
       from audit_entries a left join users u on a.actor_kind = 'staff' and u.id::text = a.actor_id
      order by a.at desc limit $1`,
    [limite],
  );
  return (
    <section className="flex flex-col gap-2.5">
      <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">{titulo}</span>
      {r.rows.length === 0 ? (
        <AdminNote tone="info">Todavía no hay acciones del equipo.</AdminNote>
      ) : (
        <div className="rounded-card border border-line bg-white">
          <AuditLog
            rows={r.rows.map((x) => ({
              key: x.id,
              who: x.quien ?? "Sistema",
              initials: x.ini ?? "S",
              action: x.action,
              before: corto(x.before),
              after: corto(x.after),
              why: x.reason ?? undefined,
              when: hace(new Date(x.at)),
              section: `${x.target_kind}${x.target_id ? " · " + x.target_id.slice(0, 18) : ""}`,
            }))}
          />
        </div>
      )}
    </section>
  );
}
