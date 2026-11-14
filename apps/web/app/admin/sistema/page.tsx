import { AdminRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { agregarMiembro, cambiarPermiso, quitarMiembro, restablecerDosPasos } from "../acciones";
import { factoresDelEquipo } from "@/lib/equipo/dos-pasos";
import {ConMotivo, Matriz, Titulo } from "../ui";
import { Auditoria } from "./Auditoria";
import { AgregarMiembro } from "./AgregarMiembro";
import { PestanasSistema } from "./Pestanas";

/* ADM-SYS · Sistema: equipo y roles, matriz de permisos (2am), auditoría (2al) y (5i) la pestaña Configuración.
   8d · Cada miembro dice si tiene llave de acceso (Face ID / huella).
   9j · Y su segundo factor (obligatorio para entrar al Super Admin: la llave o la app de códigos; lib/equipo/dos-pasos.ts). Un Admin restablece los
   dos pasos de otra persona que perdió el teléfono (con motivo, auditoría y aviso). */
export default async function Sistema() {
  const s = await requerir("sys", "ver");
  const editar = s.puede("sys", "editar");
  const [eq, roles, secc, perms] = await Promise.all([
    db().query<{ user_id: string; nombre: string; phone: string; role: string; rol: string; status: string; desde: Date; llaves: number }>(
      `select m.user_id, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) as nombre, u.phone, m.role,
              r.name->>'es' as rol, m.status, m.added_at as desde,
              (select count(*)::int from passkeys p where p.user_id = m.user_id and p.revoked_at is null) as llaves
         from staff_members m join users u on u.id = m.user_id join staff_roles r on r.key = m.role
        where m.status <> 'removed' order by r.sort, m.added_at`,
    ),
    db().query<{ key: string; name: string }>("select key, name->>'es' as name from staff_roles order by sort"),
    db().query<{ key: string; name: string }>("select key, name->>'es' as name from admin_sections order by sort"),
    db().query<{ k: string }>("select role || ':' || section || ':' || action as k from role_permissions where allowed"),
  ]);
  const permisos = Object.fromEntries(perms.rows.map((p) => [p.k, true]));
  const factores = await factoresDelEquipo(eq.rows.map((m) => m.user_id));
  const dia = (iso: string) => new Date(iso).toLocaleDateString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short" });
  const segundo = (id: string, llaves: number) => {
    const f = factores.get(id);
    if (f?.app) return `app de códigos desde ${dia(f.app)} (${f.quedan} de recuperación)`;
    if (llaves) return "segundo factor: su llave";
    if (f?.pruebas) return "MODO PRUEBAS: entra sin segundo factor";
    return "SIN SEGUNDO FACTOR: lo da de alta al entrar";
  };
  const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · SISTEMA" titulo="Equipo, permisos y auditoría" sub="Cada cambio pide motivo y queda en la auditoría, que nadie puede editar ni borrar. Para entrar aquí, cada miembro usa su llave de acceso o su app de códigos además del SMS." />
      <PestanasSistema on="equipo" />
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">EQUIPO · {eq.rows.length}</span>
        <div className="flex flex-col gap-2">
          {eq.rows.map((m) => (
            <div key={m.user_id} className="flex flex-col gap-2">
              <AdminRow
                initials={m.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                title={m.nombre || "(sin nombre)"}
                sub={`${fmt(m.phone)} · desde ${new Date(m.desde).toLocaleDateString("es-US", { timeZone: "America/New_York" })} · ${m.llaves ? `con llave de acceso (${m.llaves})` : "sin llave de acceso: solo SMS"} · ${segundo(m.user_id, m.llaves)}`}
                tag={m.rol.toUpperCase()}
                tone={m.role === "admin" ? "ink" : "neutral"}
              />
              {editar && m.user_id !== s.id && factores.get(m.user_id)?.app && (
                <ConMotivo accion={restablecerDosPasos} campos={{ usuario: m.user_id }} boton="Restablecer sus dos pasos"
                  titulo={`Restablecer los dos pasos de ${m.nombre}`} sub="Su app de códigos deja de servir y sus sesiones vuelven a pedir el segundo factor: la da de alta otra vez al entrar. Le llega un aviso."
                  plantillas={["Perdió el teléfono y sus códigos de recuperación", "Cambió de teléfono"]} cta="Restablecer" />
              )}
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
