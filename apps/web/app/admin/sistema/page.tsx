import { AdminRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { agregarMiembro, cambiarPermiso, quitarMiembro } from "../acciones";
import {ConMotivo, Matriz, Titulo } from "../ui";
import { Auditoria } from "./Auditoria";
import { AgregarMiembro } from "./AgregarMiembro";
import { PestanasSistema } from "./Pestanas";

/* ADM-SYS · Sistema: equipo y roles, matriz de permisos (2am), auditoría (2al) y (5i) la pestaña Configuración. */
export default async function Sistema() {
  const s = await requerir("sys", "ver");
  const editar = s.puede("sys", "editar");
  const [eq, roles, secc, perms] = await Promise.all([
    db().query<{ user_id: string; nombre: string; phone: string; role: string; rol: string; status: string; desde: Date }>(
      `select m.user_id, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) as nombre, u.phone, m.role,
              r.name->>'es' as rol, m.status, m.added_at as desde
         from staff_members m join users u on u.id = m.user_id join staff_roles r on r.key = m.role
        where m.status <> 'removed' order by r.sort, m.added_at`,
    ),
    db().query<{ key: string; name: string }>("select key, name->>'es' as name from staff_roles order by sort"),
    db().query<{ key: string; name: string }>("select key, name->>'es' as name from admin_sections order by sort"),
    db().query<{ k: string }>("select role || ':' || section || ':' || action as k from role_permissions where allowed"),
  ]);
  const permisos = Object.fromEntries(perms.rows.map((p) => [p.k, true]));
  const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · SISTEMA" titulo="Equipo, permisos y auditoría" sub="Cada cambio pide motivo y queda en la auditoría, que nadie puede editar ni borrar." />
      <PestanasSistema on="equipo" />
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">EQUIPO · {eq.rows.length}</span>
        <div className="flex flex-col gap-2">
          {eq.rows.map((m) => (
            <div key={m.user_id} className="flex flex-col gap-2">
              <AdminRow
                initials={m.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                title={m.nombre || "(sin nombre)"}
                sub={`${fmt(m.phone)} · desde ${new Date(m.desde).toLocaleDateString("es-US", { timeZone: "America/New_York" })}`}
                tag={m.rol.toUpperCase()}
                tone={m.role === "admin" ? "ink" : "neutral"}
              />
              {editar && m.user_id !== s.id && (
                <ConMotivo accion={quitarMiembro} campos={{ usuario: m.user_id }} boton="Quitar del equipo" peligro
                  titulo={`Quitar a ${m.nombre} del equipo`} sub="Pierde el acceso al Super Admin al instante. Su cuenta de vecino sigue igual."
                  plantillas={["Ya no trabaja con To'Latino", "Cambio de responsabilidades"]} cta="Quitar" />
              )}
            </div>
          ))}
        </div>
        {editar && <AgregarMiembro roles={roles.rows} accion={agregarMiembro} />}
      </section>
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">PERMISOS POR ROL{editar ? " · TOCA UNA CASILLA PARA CAMBIARLA" : ""}</span>
        <Matriz roles={roles.rows} secciones={secc.rows} acciones={["ver", "editar", "aprobar", "retirar", "exportar"]} permisos={permisos} puedeEditar={editar} accion={cambiarPermiso} />
      </section>
      <Auditoria />
    </>
  );
}
