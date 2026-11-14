import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
import { yo, type Yo } from "./cuenta";
import { db, tx } from "./db";
import { estadoDosPasos, type Dos } from "./equipo/dos-pasos";

/* Super Admin: quién es del equipo, qué puede hacer y el rastro de cada acción.
   Regla: el permiso se revisa SIEMPRE aquí (servidor). La pantalla solo esconde lo que no puedes. */

export type Accion = "ver" | "editar" | "aprobar" | "retirar" | "exportar";
export type Staff = Yo & { role: string; roleName: string; cities: string[]; puede: (s: string, a: Accion) => boolean };


/* La fila del equipo de una persona (rol, ciudades y permisos), SIN mirar el segundo factor. Solo la usan staff() y la pantalla de los dos pasos. */
async function filaEquipo(u: Yo): Promise<Staff | null> {
  const r = await db().query<{ role: string; role_name: string; cities: string[]; perms: string[] | null }>(
    `select m.role, r.name->>'es' as role_name, m.cities,
            array_agg(p.section || ':' || p.action) filter (where p.allowed) as perms
       from staff_members m join staff_roles r on r.key = m.role
       left join role_permissions p on p.role = m.role
      where m.user_id = $1 and m.status = 'active'
      group by m.role, r.name, m.cities`,
    [u.id],
  );
  const m = r.rows[0];
  if (!m) return null;
  const set = new Set(m.perms ?? []);
  return { ...u, role: m.role, roleName: m.role_name, cities: m.cities, puede: (s, a) => set.has(`${s}:${a}`) };
}

/* 9j · Del equipo Y con el segundo factor dado en ESTA sesión (lib/equipo/dos-pasos.ts): sin eso, null (ninguna pantalla, acción ni ruta del
   Super Admin abre; guardián equipoConDosPasos). */
export async function staff(): Promise<Staff | null> {
  const u = await yo();
  if (!u) return null;
  const s = await filaEquipo(u);
  if (!s) return null;
  if ((await estadoDosPasos(u)).estado !== "ok") return null;
  return s;
}

/* 9j · Para el marco del Super Admin y la pantalla de los dos pasos: ¿es del equipo? y ¿ya dio su segundo factor? */
export async function miembroEquipo(): Promise<{ staff: Staff; dos: Dos } | null> {
  const u = await yo();
  if (!u) return null;
  const s = await filaEquipo(u);
  if (!s) return null;
  return { staff: s, dos: await estadoDosPasos(u) };
}

/* Sin cuenta → a entrar. Sin permiso → al inicio del admin con aviso (nunca un error en pantalla). */
export async function requerir(seccion: string, accion: Accion = "ver"): Promise<Staff> {
  const m = await miembroEquipo();
  if (!m) redirect("/entrar");
  // 9j · Del equipo pero sin el segundo factor de esta sesión: a la pantalla de los dos pasos (nunca a la sección).
  if (m.dos.estado !== "ok") redirect("/admin/dos-pasos");
  const s = m.staff;
  if (!s.puede(seccion, accion)) {
    if (seccion === "home") redirect("/cuenta");
    redirect(`/admin?sin=${encodeURIComponent(`${seccion}:${accion}`)}`);
  }
  return s;
}

/* Auditoría: solo se agrega (la tabla lo impone con un trigger). */
export async function auditar(
  c: PoolClient,
  a: { actor: string; action: string; targetKind: string; targetId?: string | null; city?: string | null; before?: unknown; after?: unknown; reason?: string | null },
) {
  await c.query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason)
     values ('staff', $1, $2, $3, $4, $5, $6, $7, $8)`,
    [a.actor, a.action, a.targetKind, a.targetId ?? null, a.city ?? null, a.before === undefined ? null : JSON.stringify(a.before), a.after === undefined ? null : JSON.stringify(a.after), a.reason ?? null],
  );
}

/* Código de arranque: convierte en Admin a la persona que lo escribe, SOLO si todavía no hay ningún Admin.
   El repo guarda la huella (sha256); el código se entrega una vez al fundador y queda inútil al usarse. */
const HUELLA_ARRANQUE = "f5afe06efbcc098a146c9b3d4f0edb2055f181e0dd1cb43bf11dde06eeab332e";

export async function hayAdmin(): Promise<boolean> {
  const r = await db().query("select 1 from staff_members where role = 'admin' and status = 'active' limit 1");
  return (r.rowCount ?? 0) > 0;
}

export async function arrancar(codigo: string): Promise<boolean> {
  const u = await yo();
  if (!u || !u.first_name) return false;
  const limpio = codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
  const a = Buffer.from(createHash("sha256").update(limpio).digest("hex"), "hex");
  const b = Buffer.from(HUELLA_ARRANQUE, "hex");
  if (!timingSafeEqual(a, b)) return false;
  return tx(async (c) => {
    await c.query("lock table staff_members in exclusive mode");
    const ya = await c.query("select 1 from staff_members where role = 'admin' and status = 'active' limit 1");
    if ((ya.rowCount ?? 0) > 0) return false;
    const usado = await c.query("select 1 from platform_config where key = 'admin_arranque_usado'");
    if ((usado.rowCount ?? 0) > 0) return false;
    await c.query("insert into staff_members (user_id, role) values ($1, 'admin')", [u.id]);
    await c.query(`insert into platform_config (key, value, note) values ('admin_arranque_usado', to_jsonb(now()), 'Código de arranque del primer Admin: usado')`);
    await auditar(c, { actor: u.id, action: "equipo.arranque", targetKind: "staff", targetId: u.id, after: { role: "admin" }, reason: "Primer Admin con el código de arranque" });
    return true;
  });
}
