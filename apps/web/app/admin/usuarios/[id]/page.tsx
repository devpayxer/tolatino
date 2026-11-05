import { AdminNote, AdminRow } from "@tolatino/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { cerrarSesion } from "../../acciones";
import {ConMotivo, Titulo } from "../../ui";

/* ADM-USR · 360° (Fase 0): datos de la cuenta y sesiones por dispositivo con cerrar / bloquear (motivo + auditoría). */
export default async function Usuario({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("usr", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [u, ses, cam] = await Promise.all([
    db().query<{ nombre: string | null; nick: string | null; phone: string; status: string; creado: Date; visto: Date | null }>(
      `select nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '') as nombre, nick, phone, status, created_at as creado, last_seen_at as visto from users where id = $1`, [id]),
    db().query<{ id: string; ua: string | null; ip: string | null; creada: Date; vista: Date; cerrada: Date | null; bloqueada: boolean; vence: Date }>(
      `select id, user_agent as ua, host(ip) as ip, created_at as creada, last_seen_at as vista, signed_out_at as cerrada, blocked as bloqueada, expires_at as vence
         from sessions where user_id = $1 order by created_at desc limit 20`, [id]),
    db().query<{ kind: string; de: string | null; a: string | null; at: Date }>(`select kind, "from" as de, "to" as a, at from account_changes where user_id = $1 order by at desc limit 10`, [id]),
  ]);
  const x = u.rows[0];
  if (!x) notFound();
  const editar = s.puede("usr", "editar");
  const f = (d: Date) => new Date(d).toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  const disp = (ua: string | null) => (!ua ? "Dispositivo" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Navegador");
  return (
    <>
      <Link href="/admin/usuarios" className="text-[13px] font-bold">← Usuarios</Link>
      <Titulo eyebrow="SUPER ADMIN · USUARIO" titulo={x.nombre ?? "(sin nombre todavía)"}
        sub={`${x.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}${x.nick ? ` · le dicen ${x.nick}` : ""} · cuenta desde ${f(x.creado)} · estado ${x.status}`} />
      <section className="flex flex-col gap-2.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">SESIONES · {ses.rows.length}</span>
        {ses.rows.length === 0 && <AdminNote tone="info">No tiene sesiones.</AdminNote>}
        {ses.rows.map((z) => {
          const viva = !z.cerrada && !z.bloqueada && new Date(z.vence) > new Date();
          return (
            <div key={z.id} className="flex flex-col gap-2">
              <AdminRow icon="phone" title={`${disp(z.ua)}${z.ip ? " · " + z.ip : ""}`}
                sub={`Entró ${f(z.creada)} · último uso ${f(z.vista)}`}
                tag={z.bloqueada ? "BLOQUEADA" : viva ? "ABIERTA" : "CERRADA"} tone={z.bloqueada ? "danger" : viva ? "signal" : "neutral"} />
              {editar && viva && (
                <div className="flex flex-wrap gap-2">
                  <ConMotivo accion={cerrarSesion} campos={{ sesion: z.id }} boton="Cerrar sesión"
                    titulo="Cerrar esta sesión" sub="La persona tendrá que volver a entrar con su teléfono en ese dispositivo."
                    plantillas={["Lo pidió la persona", "Posible acceso de otra persona", "Teléfono perdido o robado"]} cta="Cerrar sesión" />
                  <ConMotivo accion={cerrarSesion} campos={{ sesion: z.id, bloquear: "1" }} boton="Bloquear dispositivo" peligro
                    titulo="Cerrar y bloquear este dispositivo" sub="La sesión se cierra y queda marcada como bloqueada en la auditoría."
                    plantillas={["Teléfono perdido o robado", "Actividad sospechosa"]} cta="Bloquear" />
                </div>
              )}
            </div>
          );
        })}
      </section>
      {cam.rows.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">CAMBIOS DE LA CUENTA</span>
          {cam.rows.map((c, i) => <AdminRow key={i} icon="edit" title={`${c.kind}: ${c.de ?? "—"} → ${c.a ?? "—"}`} sub={f(c.at)} />)}
        </section>
      )}
    </>
  );
}
