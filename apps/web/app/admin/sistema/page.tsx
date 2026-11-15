import { AdminRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { agregarMiembro, cambiarPermiso, quitarMiembro, restablecerDosPasos } from "../acciones";
import { factoresDelEquipo } from "@/lib/equipo/dos-pasos";
import {ConMotivo, Matriz, Titulo } from "../ui";
import { Auditoria } from "./Auditoria";
import { AgregarMiembro } from "./AgregarMiembro";
import { PestanasSistema } from "./Pestanas";
import { idioma } from "@/lib/idioma";

/* ADM-SYS · Sistema: equipo y roles, matriz de permisos (2am), auditoría (2al) y (5i) la pestaña Configuración.
   8d · Cada miembro dice si tiene llave de acceso (Face ID / huella).
   9j · Y su segundo factor (obligatorio para entrar al Super Admin: la llave o la app de códigos; lib/equipo/dos-pasos.ts). Un Admin restablece los
   dos pasos de otra persona que perdió el teléfono (con motivo, auditoría y aviso). */
export default async function Sistema() {
  const s = await requerir("sys", "ver");
  const editar = s.puede("sys", "editar");
  const lang = await idioma();
  const E = (es: string, en: string) => (lang === "en" ? en : es);
  const loc = lang === "en" ? "en-US" : "es-US";
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
  const dia = (iso: string) => new Date(iso).toLocaleDateString(loc, { timeZone: "America/New_York", day: "numeric", month: "short" });
  const segundo = (id: string, llaves: number) => {
    const f = factores.get(id);
    if (f?.app) return E(`app de códigos desde ${dia(f.app)} (${f.quedan} de recuperación)`, `authenticator app since ${dia(f.app)} (${f.quedan} recovery codes left)`);
    if (llaves) return E("segundo factor: su llave", "second factor: their passkey");
    if (f?.pruebas) return E("MODO PRUEBAS: entra sin segundo factor", "TEST MODE: signs in without a second factor");
    return E("SIN SEGUNDO FACTOR: lo da de alta al entrar", "NO SECOND FACTOR: sets it up on sign-in");
  };
  const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return (
    <>
      <Titulo eyebrow={E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM")} titulo={E("Equipo, permisos y auditoría", "Team, permissions and audit log")} sub={E("Cada cambio pide motivo y queda en la auditoría, que nadie puede editar ni borrar. Para entrar aquí, cada miembro usa su llave de acceso o su app de códigos además del SMS.", "Every change asks for a reason and stays in the audit log, which nobody can edit or delete. To get in here, each member uses their passkey or authenticator app in addition to SMS.")} />
      <PestanasSistema on="equipo" l={lang} />
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">{E("EQUIPO", "TEAM")} · {eq.rows.length}</span>
        <div className="flex flex-col gap-2">
          {eq.rows.map((m) => (
            <div key={m.user_id} className="flex flex-col gap-2">
              <AdminRow
                initials={m.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                title={m.nombre || E("(sin nombre)", "(no name)")}
                sub={`${fmt(m.phone)} · ${E("desde", "since")} ${new Date(m.desde).toLocaleDateString(loc, { timeZone: "America/New_York" })} · ${m.llaves ? E(`con llave de acceso (${m.llaves})`, `with passkey (${m.llaves})`) : E("sin llave de acceso: solo SMS", "no passkey: SMS only")} · ${segundo(m.user_id, m.llaves)}`}
                tag={m.rol.toUpperCase()}
                tone={m.role === "admin" ? "ink" : "neutral"}
              />
              {m.user_id === s.id && (
                <a href="/admin/seguridad" className="self-start px-1 text-[12.5px] font-extrabold text-action">{E("Mis dos pasos: cambiar mi app de códigos o pedir códigos de recuperación nuevos", "My two-step: change my authenticator app or get new recovery codes")}</a>
              )}
              {editar && m.user_id !== s.id && factores.get(m.user_id)?.app && (
                <ConMotivo accion={restablecerDosPasos} campos={{ usuario: m.user_id }} boton={E("Restablecer sus dos pasos", "Reset their two-step")}
                  titulo={E(`Restablecer los dos pasos de ${m.nombre}`, `Reset two-step for ${m.nombre}`)} sub={E("Su app de códigos deja de servir y sus sesiones vuelven a pedir el segundo factor: la da de alta otra vez al entrar. Le llega un aviso.", "Their authenticator app stops working and their sessions ask for the second factor again: they set it up again on sign-in. They get a notification.")}
                  plantillas={[E("Perdió el teléfono y sus códigos de recuperación", "Lost their phone and recovery codes"), E("Cambió de teléfono", "Changed phones")]} cta={E("Restablecer", "Reset")} />
              )}
              {editar && m.user_id !== s.id && (
                <ConMotivo accion={quitarMiembro} campos={{ usuario: m.user_id }} boton={E("Quitar del equipo", "Remove from team")} peligro
                  titulo={E(`Quitar a ${m.nombre} del equipo`, `Remove ${m.nombre} from the team`)} sub={E("Pierde el acceso al Super Admin al instante. Su cuenta de vecino sigue igual.", "Loses Super Admin access immediately. Their neighbor account stays the same.")}
                  plantillas={[E("Ya no trabaja con To'Latino", "No longer works with To’Latino"), E("Cambio de responsabilidades", "Change of responsibilities")]} cta={E("Quitar", "Remove")} />
              )}
            </div>
          ))}
        </div>
        {editar && <AgregarMiembro roles={roles.rows} accion={agregarMiembro} />}
      </section>
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">{E("PERMISOS POR ROL", "PERMISSIONS BY ROLE")}{editar ? E(" · TOCA UNA CASILLA PARA CAMBIARLA", " · TAP A BOX TO CHANGE IT") : ""}</span>
        <Matriz roles={roles.rows} secciones={secc.rows} acciones={["ver", "editar", "aprobar", "retirar", "exportar"]} permisos={permisos} puedeEditar={editar} accion={cambiarPermiso} />
      </section>
      <Auditoria />
    </>
  );
}
