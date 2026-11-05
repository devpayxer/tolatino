import { AdminNote, AdminRow } from "@tolatino/ui";
import Link from "next/link";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import {Titulo } from "../ui";

/* ADM-USR · Usuarios: búsqueda por nombre o teléfono, 25 por página (cursor por fecha). */
export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; antes?: string }> }) {
  await requerir("usr", "ver");
  const { q = "", antes } = await searchParams;
  const term = q.trim().slice(0, 60);
  const dig = term.replace(/\D/g, "");
  const r = await db().query<{ id: string; nombre: string | null; phone: string; status: string; creado: Date; sesiones: number; staff: string | null }>(
    `select u.id, nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')), '') as nombre, u.phone, u.status, u.created_at as creado,
            (select count(*)::int from sessions s where s.user_id = u.id and s.signed_out_at is null and s.expires_at > now()) as sesiones,
            (select r.name->>'es' from staff_members m join staff_roles r on r.key = m.role where m.user_id = u.id and m.status = 'active') as staff
       from users u
      where ($1 = '' or (length($2) >= 3 and u.phone like '%' || $2 || '%')
             or lower(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) like '%' || lower($1) || '%')
        and ($3::timestamptz is null or u.created_at < $3::timestamptz)
      order by u.created_at desc limit 26`,
    [term, dig, antes ?? null],
  );
  const filas = r.rows.slice(0, 25);
  const mas = r.rows.length > 25;
  const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · USUARIOS" titulo="Usuarios" sub="Toca una persona para ver sus sesiones y cerrarlas o bloquear un dispositivo." />
      <form className="flex gap-2">
        <input name="q" defaultValue={term} placeholder="Nombre o teléfono" aria-label="Buscar usuario"
          className="h-11 min-w-0 flex-1 rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] font-semibold outline-none focus:border-ink" />
        <button className="h-11 rounded-button bg-ink px-4 text-[14px] font-bold text-white">Buscar</button>
      </form>
      {filas.length === 0 ? (
        <AdminNote tone="info">{term ? `Nadie coincide con «${term}».` : "Todavía no hay usuarios."}</AdminNote>
      ) : (
        <div className="flex flex-col gap-2">
          {filas.map((u) => (
            <Link key={u.id} href={`/admin/usuarios/${u.id}`} className="text-ink hover:text-ink">
              <AdminRow
                initials={(u.nombre ?? "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                title={u.nombre ?? "(sin nombre todavía)"}
                sub={`${fmt(u.phone)} · ${u.sesiones} ${u.sesiones === 1 ? "sesión abierta" : "sesiones abiertas"}`}
                tag={u.staff ? u.staff.toUpperCase() : u.status !== "active" ? u.status.toUpperCase() : undefined}
                tone={u.staff ? "ink" : "neutral"}
                chevron
              />
            </Link>
          ))}
        </div>
      )}
      {mas && (
        <div className="flex">
          <Link href={`/admin/usuarios?q=${encodeURIComponent(term)}&antes=${encodeURIComponent(new Date(filas[filas.length - 1]!.creado).toISOString())}`}
            className="flex h-11 flex-1 items-center justify-center rounded-button border-[1.5px] border-line-strong bg-white text-[14px] font-bold text-ink">
            Ver más
          </Link>
        </div>
      )}
    </>
  );
}
