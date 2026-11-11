"use server";
/* Acciones del 360° de una persona (ADM-USR). Cada una: permiso de la matriz (usr:editar / usr:retirar /
   usr:exportar; banear y restaurar = rol Admin), la persona está en las ciudades de quien actúa, motivo → cambio →
   auditoría (antes → después), en una transacción. Lo que la persona ve: al entrar (suspensión, baneo, borrado) y en
   Mi cuenta y Recomendar (advertencia, silencio). Nadie se sanciona a sí mismo ni a alguien del equipo. */
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Accion, type Staff } from "@/lib/admin";
import { dispositivo } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { ORDEN_SANCIONES, SANCIONES, type Sancion } from "@/lib/sanciones";
import { aplicarSancion, avisarSancion } from "@/lib/apelaciones";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type U = { id: string; city_id: string | null; status: string; estado: string; nombre: string; staff: boolean; delete_at: string | null; photo: string | null; phone_ok: string | null };

async function persona(c: PoolClient, s: Staff, id: string): Promise<U | null> {
  return (await c.query<U>(
    `select u.id, u.home_city_id as city_id, u.status, cuenta_estado(u.status, u.status_until) as estado, u.delete_at, u.photo_url as photo, u.phone_verified_at as phone_ok,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as nombre,
            exists (select 1 from staff_members m where m.user_id = u.id and m.status = 'active') as staff
       from users u where u.id = $1 and (cardinality($2::text[]) = 0 or u.home_city_id = any($2::text[])) for update of u`, [id, s.cities])).rows[0] ?? null;
}
const BORRADA = ["deleted_pending", "deleted", "merged"];
/* Estado en palabras para el historial (nunca el valor interno). */
const EST: Record<string, string> = { active: "activa", muted: "silenciada", suspended: "suspendida", banned: "baneada", deleted_pending: "borrándose", deleted: "borrada", merged: "fusionada" };
const listo = (id: string) => { revalidatePath(`/admin/usuarios/${id}`); revalidatePath("/admin/usuarios"); };

async function hacer(id: unknown, permisos: Accion[], motivo: unknown, fn: (c: PoolClient, s: Staff, u: U, m: string) => Promise<string | null>, ok: string, opc: { sinMotivo?: string; borrada?: boolean } = {}): Promise<ResAdm> {
  const s = await staff();
  if (!s || !permisos.some((a) => s.puede("usr", a))) return no("Tu rol no puede hacer esto.");
  if (typeof id !== "string" || !UUID.test(id)) return no("Esa persona no existe.");
  const m = opc.sinMotivo ?? motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const u = await persona(c, s, id);
    if (!u) return "Esa persona no existe.";
    if (!opc.borrada && BORRADA.includes(u.status)) return "Esta cuenta está borrada.";
    return fn(c, s, u, m);
  });
  if (r) return no(r);
  listo(id);
  return { ok: true, mensaje: ok };
}
const cerrarTodas = (c: PoolClient, userId: string) =>
  c.query(`update sessions set signed_out_at = now() where user_id = $1 and signed_out_at is null`, [userId]);

/* Nota interna: solo la ve el equipo (solo se agregan). */
export async function notaUsuario(id: string, texto: string): Promise<ResAdm> {
  const t = motivoOk(texto);
  if (!t) return no("Escribe la nota.");
  return hacer(id, ["editar", "retirar"], t, async (c, s, u) => {
    await c.query(`insert into admin_notes (target_kind, target_id, city_id, text, by_staff) values ('user', $1, $2, $3, $4)`, [u.id, u.city_id, t.slice(0, 1000), s.id]);
    await auditar(c, { actor: s.id, action: "usuario.nota", targetKind: "user", targetId: u.id, city: u.city_id, after: { nota: t.slice(0, 120) } });
    return null;
  }, "Nota guardada. Solo la ve el equipo.", { borrada: true });
}

/* Sancionar (usr:retirar; banear solo un Admin). El efecto lo aplica el servidor. */
export async function sancionar(id: string, kind: Sancion, motivo: string): Promise<ResAdm> {
  if (!ORDEN_SANCIONES.includes(kind)) return no("Elige la sanción.");
  const k = SANCIONES[kind];
  if (k.admin) { const s = await staff(); if (s?.role !== "admin") return no("Solo un Admin banea una cuenta."); }
  let hecha: { sid: string; m: string } | null = null;
  const r = await hacer(id, ["retirar"], motivo, async (c, s, u, m) => {
    if (u.id === s.id) return "No puedes sancionar tu propia cuenta.";
    if (u.staff) return "Es del equipo de To’Latino: quítale el rol en Sistema › Equipo antes.";
    if (u.estado === "banned") return "La cuenta ya está baneada.";
    // 5d · Una sola forma de sancionar (lib/apelaciones.ts aplicarSancion: sanción, estado de la cuenta, sesiones) y el aviso con «Apelar».
    hecha = { sid: await aplicarSancion(c, { userId: u.id, ciudad: u.city_id, kind, motivo: m, staffId: s.id }), m };
    await auditar(c, { actor: s.id, action: "usuario.sancionar", targetKind: "user", targetId: u.id, city: u.city_id, before: { estado: EST[u.estado] ?? u.estado }, after: { sancion: k.es }, reason: m });
    return null;
  }, kind === "susp14" || kind === "ban" ? "Sanción aplicada. Sus sesiones se cerraron; ve el motivo al intentar entrar." : "Sanción aplicada. La ve con su motivo en su cuenta y puede apelar.");
  const h = hecha as { sid: string; m: string } | null;
  if (r.ok && h) await avisarSancion(id, h.sid, kind, h.m);
  return r;
}

/* Levantar: termina las sanciones vigentes y la cuenta vuelve a activa. */
export async function levantar(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["retirar"], motivo, async (c, s, u, m) => {
    const n = (await c.query(`update sanctions set lifted_at = now(), lifted_by = $2, lift_reason = $3
                               where target_kind = 'user' and target_id = $1::text and lifted_at is null and (ends_at is null or ends_at > now())`, [u.id, s.id, m])).rowCount ?? 0;
    if (!n && u.estado === "active") return "No tiene sanciones vigentes.";
    await c.query(`update users set status = 'active', status_until = null, status_reason = null where id = $1 and status in ('muted', 'suspended', 'banned')`, [u.id]);
    await auditar(c, { actor: s.id, action: "usuario.levantar", targetKind: "user", targetId: u.id, city: u.city_id, before: { estado: EST[u.estado] ?? u.estado }, after: { estado: "sin sanción" }, reason: m });
    return null;
  }, "Sanción levantada.");
}

/* Quitar la foto de perfil (usr:editar o retirar). */
export async function quitarFotoPerfil(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar", "retirar"], motivo, async (c, s, u, m) => {
    if (!u.photo) return "No tiene foto de perfil.";
    await c.query(`update users set photo_url = null, photo_removed_reason = $2 where id = $1`, [u.id, m]);
    await auditar(c, { actor: s.id, action: "usuario.foto.quitar", targetKind: "user", targetId: u.id, city: u.city_id, before: { foto: "visible" }, after: { foto: "quitada" }, reason: m });
    return null;
  }, "Foto quitada.");
}

/* Cerrar todas las sesiones: entra otra vez con el código por SMS en cada dispositivo. */
export async function cerrarSesiones(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar", "retirar"], motivo, async (c, s, u, m) => {
    const n = (await cerrarTodas(c, u.id)).rowCount ?? 0;
    if (!n) return "No tiene sesiones abiertas.";
    await auditar(c, { actor: s.id, action: "usuario.sesiones.cerrar", targetKind: "user", targetId: u.id, city: u.city_id, before: { abiertas: n }, after: { abiertas: 0 }, reason: m });
    return null;
  }, "Sesiones cerradas.");
}

/* Un dispositivo: cerrar su sesión (editar), bloquearlo para cualquier cuenta o desbloquearlo (retirar). `sid` es la
   sesión más reciente del dispositivo; el dispositivo sale de ella (nunca del cliente). */
export async function dispositivoAccion(id: string, sid: string, accion: "cerrar" | "bloquear" | "desbloquear", motivo: string): Promise<ResAdm> {
  if (!["cerrar", "bloquear", "desbloquear"].includes(accion) || typeof sid !== "string" || !UUID.test(sid)) return no("Ese dispositivo no existe.");
  const mio = await dispositivo(false);
  return hacer(id, accion === "cerrar" ? ["editar", "retirar"] : ["retirar"], motivo, async (c, s, u, m) => {
    const se = (await c.query<{ id: string; device: string | null }>(`select id, device::text from sessions where id = $1 and user_id = $2`, [sid, u.id])).rows[0];
    if (!se) return "Ese dispositivo no existe.";
    const mismo = se.device ? "device = $1::uuid" : "id = $1";
    if (accion === "cerrar") {
      const n = (await c.query(`update sessions set signed_out_at = now() where ${mismo} and user_id = $2 and signed_out_at is null`, [se.device ?? se.id, u.id])).rowCount ?? 0;
      if (!n) return "Ese dispositivo no tiene una sesión abierta.";
      await auditar(c, { actor: s.id, action: "usuario.sesion.cerrar", targetKind: "user", targetId: u.id, city: u.city_id, before: { sesion: "abierta" }, after: { sesion: "cerrada", ref: { dispositivo: se.device ?? se.id } }, reason: m });
    } else if (accion === "bloquear") {
      if (se.device && se.device === mio) return "Es el dispositivo desde el que estás trabajando: no se bloquea desde aquí.";
      if (se.device) {
        const ya = (await c.query(`select 1 from blocked_devices where device = $1::uuid and lifted_at is null`, [se.device])).rowCount;
        if (ya) return "Ese dispositivo ya está bloqueado.";
        await c.query(`insert into blocked_devices (device, user_id, reason, by_staff) values ($1::uuid, $2, $3, $4)`, [se.device, u.id, m, s.id]);
        // Nadie sigue dentro desde ese dispositivo, sea cual sea la cuenta.
        await c.query(`update sessions set signed_out_at = coalesce(signed_out_at, now()), blocked = true where device = $1::uuid`, [se.device]);
      } else await c.query(`update sessions set signed_out_at = coalesce(signed_out_at, now()), blocked = true where id = $1`, [se.id]);
      await auditar(c, { actor: s.id, action: "usuario.dispositivo.bloquear", targetKind: "user", targetId: u.id, city: u.city_id, before: { dispositivo: "permitido" }, after: { dispositivo: "bloqueado", ref: { id: se.device ?? se.id } }, reason: m });
    } else {
      const n = se.device ? (await c.query(`update blocked_devices set lifted_at = now(), lifted_by = $2, lift_reason = $3 where device = $1::uuid and lifted_at is null`, [se.device, s.id, m])).rowCount ?? 0 : 0;
      const k = (await c.query(`update sessions set blocked = false where ${mismo} and blocked`, [se.device ?? se.id])).rowCount ?? 0;
      if (!n && !k) return "Ese dispositivo no está bloqueado.";
      await auditar(c, { actor: s.id, action: "usuario.dispositivo.desbloquear", targetKind: "user", targetId: u.id, city: u.city_id, before: { dispositivo: "bloqueado" }, after: { dispositivo: "permitido", ref: { id: se.device ?? se.id } }, reason: m });
    }
    return null;
  }, accion === "cerrar" ? "Sesión cerrada." : accion === "bloquear" ? "Dispositivo bloqueado: ninguna cuenta entra desde él." : "Dispositivo desbloqueado.");
}

/* Restablecer verificación: se cierran sus sesiones y al entrar le pedimos el código por SMS otra vez. */
export async function restablecerVerificacion(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    if (!u.phone_ok) return "Ya está pendiente: al entrar le pedimos el código.";
    await c.query(`update users set phone_verified_at = null where id = $1`, [u.id]);
    await cerrarTodas(c, u.id);
    await auditar(c, { actor: s.id, action: "usuario.verificacion.restablecer", targetKind: "user", targetId: u.id, city: u.city_id, before: { telefono: "verificado" }, after: { telefono: "pide código" }, reason: m });
    return null;
  }, "Verificación restablecida. Sus sesiones se cerraron.");
}

/* Cambiar Mi ciudad: se salta la regla de 30 días. Si la ciudad aún no abre, queda en su lista de espera. */
export async function cambiarCiudadUsuario(id: string, ciudad: string, motivo: string): Promise<ResAdm> {
  if (typeof ciudad !== "string" || !/^[a-z0-9-]{2,40}$/.test(ciudad)) return no("Elige la ciudad.");
  return hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    if (s.cities.length && !s.cities.includes(ciudad)) return "Esa ciudad no es de las tuyas.";
    const ci = (await c.query<{ id: string; name: string; status: string }>(`select id, name, status from cities where id = $1 and status <> 'off'`, [ciudad])).rows[0];
    if (!ci) return "Esa ciudad no existe.";
    if (ci.id === u.city_id) return "Ya es su ciudad.";
    const antes = u.city_id ? (await c.query<{ name: string }>(`select name from cities where id = $1`, [u.city_id])).rows[0]?.name ?? u.city_id : null;
    await c.query(`update users set home_city_id = $2, home_city_changed_at = now(), zone_id = null where id = $1`, [u.id, ci.id]);
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'city', $2, $3, 'staff')`, [u.id, antes, ci.name]);
    if (ci.status !== "on") await c.query(
      `insert into city_waitlist (city_id, user_id, source) select $1, $2, 'city' where not exists (select 1 from city_waitlist where city_id = $1 and user_id = $2 and removed_at is null)`, [ci.id, u.id]);
    await auditar(c, { actor: s.id, action: "usuario.ciudad", targetKind: "user", targetId: u.id, city: ci.id, before: { ciudad: antes }, after: { ciudad: ci.name }, reason: m });
    return null;
  }, "Ciudad cambiada.");
}

/* Pedido de borrado: entra a Cambios sensibles y otra persona lo aprueba (30 días de gracia después). */
export async function pedirBorrado(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    if (u.id === s.id) return "Tu propia cuenta no se borra desde aquí.";
    if (u.staff) return "Es del equipo de To’Latino: quítale el rol en Sistema › Equipo antes.";
    const ya = (await c.query(`select 1 from sensitive_changes where type = 'deleteUser' and target_id = $1 and status = 'pending'`, [u.id])).rowCount;
    if (ya) return "Ya hay un pedido de borrado en la cola.";
    const cs = (await c.query<{ id: string }>(
      `insert into sensitive_changes (type, target_kind, target_id, city_id, reason, requested_by) values ('deleteUser', 'user', $1, $2, $3, $4) returning id`, [u.id, u.city_id, m, s.id])).rows[0]!;
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id) values ('cambio', 'sensitive_change', $1, $2)`, [cs.id, u.city_id]);
    await auditar(c, { actor: s.id, action: "usuario.borrado.pedir", targetKind: "user", targetId: u.id, city: u.city_id, after: { pedido: cs.id }, reason: m });
    return null;
  }, "En la cola de Cambios sensibles.");
}

/* Restaurar una cuenta borrada dentro de los 30 días de gracia (solo un Admin). */
export async function restaurarCuenta(id: string, motivo: string): Promise<ResAdm> {
  const s0 = await staff();
  if (s0?.role !== "admin") return no("Solo un Admin restaura una cuenta.");
  return hacer(id, ["retirar"], motivo, async (c, s, u, m) => {
    if (u.status !== "deleted_pending" || !u.delete_at || new Date(u.delete_at).getTime() < Date.now()) return "Esta cuenta ya no se puede restaurar.";
    await c.query(`update users set status = 'active', delete_at = null, status_until = null, status_reason = null where id = $1`, [u.id]);
    await auditar(c, { actor: s.id, action: "usuario.restaurar", targetKind: "user", targetId: u.id, city: u.city_id, before: { estado: "borrada" }, after: { estado: "activa" }, reason: m });
    return null;
  }, "Cuenta restaurada.", { borrada: true });
}

/* Exportar sus datos (pedido de privacidad): lo que To'Latino guarda de la persona, en JSON. Queda en la auditoría. */
export async function exportarDatos(id: string, motivo: string): Promise<ResAdm & { archivo?: string }> {
  let archivo = "";
  const r = await hacer(id, ["exportar"], motivo, async (c, s, u, m) => {
    const q = async (sql: string) => (await c.query(sql, [u.id])).rows;
    const data = {
      cuenta: (await q(`select id, phone as telefono, email::text as correo, first_name as nombre, last_name as apellido, nick as apodo, lang as idioma, home_city_id as ciudad,
                               zone_id as zona, status as estado, created_at as desde, last_seen_at as ultima_vez from users where id = $1`))[0],
      cambios_de_cuenta: await q(`select kind as tipo, "from" as antes, "to" as despues, by as quien, at as fecha from account_changes where user_id = $1 order by at`),
      dispositivos: await q(`select coalesce(name, '') as nombre, platform as plataforma, user_agent, host(ip) as ip, created_at as primera, last_seen_at as ultima, signed_out_at as cerrada
                               from sessions where user_id = $1 order by created_at`),
      negocios: await q(`select b.id, b.name as nombre, m.kind as rol, m.status as estado from business_members m join businesses b on b.id = m.business_id where m.user_id = $1`),
      recomendaciones: await q(`select business_name as negocio, status as estado, created_at as fecha from recommendations where by_user_id = $1 order by created_at`),
      reportes_de_fotos: await q(`select reason as motivo, note as nota, status as estado, created_at as fecha from photo_reports where reporter_user_id = $1 order by created_at`),
      reclamos: await q(`select id, business_id as negocio, status as estado, created_at as fecha from claims where user_id = $1 order by created_at`),
      lista_de_espera: await q(`select coalesce(city_id, city_name) as ciudad, created_at as fecha from city_waitlist where user_id = $1 and removed_at is null`),
      guardados: await q(`select kind as tipo, target_id as id, created_at as fecha from favorites where user_id = $1`),
      siguiendo: await q(`select target_kind as tipo, target_id as id, created_at as fecha from follows where follower_user_id = $1`),
      sanciones: await q(`select kind as tipo, reason as motivo, starts_at as desde, ends_at as hasta, lifted_at as levantada from sanctions where target_kind = 'user' and target_id = $1::text order by starts_at`),
      generado: new Date().toISOString(),
    };
    archivo = JSON.stringify(data, null, 2);
    await auditar(c, { actor: s.id, action: "usuario.exportar", targetKind: "user", targetId: u.id, city: u.city_id, after: { archivo: "datos de la cuenta" }, reason: m });
    return null;
  }, "Datos exportados. Quedó en la auditoría.", { borrada: true });
  return r.ok ? { ...r, archivo } : r;
}

/* 5i · Usuarios 360° › Comunidad › «Abrir caso de red de cuentas» (MEM 699): seguidores o votos desde el mismo dispositivo que esta cuenta.
   Abre (o reúsa, si ya está abierto) el caso en la cola Reportes de usuario (repUsr) con la marca «red» y el motivo; lo decide una persona
   en Colas, con su escalera de sanciones y la apelación. Queda en la auditoría. */
export async function usrCasoRed(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar", "retirar"], motivo, async (c, s, u, m) => {
    if (u.staff) return "Es del equipo de To’Latino: se revisa desde Sistema › Equipo.";
    const { marcar } = await import("@/lib/moderacion");
    const caso = await marcar(c, { kind: "user", id: u.id, regla: "red", autor: u.id, ciudad: u.city_id, detalle: `Abierto por el equipo desde Usuarios 360°: ${m}` });
    if (!caso) return "Esta cuenta no tiene ciudad: el caso no tiene a qué cola ir.";
    await auditar(c, { actor: s.id, action: "usuario.red.caso", targetKind: "user", targetId: u.id, city: u.city_id, before: { caso: "sin caso de red" }, after: { caso: "abierto en Reportes de usuario" }, reason: m });
    return null;
  }, "Caso abierto en Colas › Reportes de usuario.");
}

/* 8c · Usuarios 360° › Avisos push: revocar un teléfono de la persona (deja de recibir push; al volver a abrir la app con su sesión puede volver a
   encenderlos ella). usr:editar, con motivo; queda en el historial. Nunca se ve ni se guarda el token: solo su huella. */
export async function pushRevocar(id: string, tokenId: string, motivo: string): Promise<ResAdm> {
  if (typeof tokenId !== "string" || !/^\d{1,18}$/.test(tokenId)) return no("Ese teléfono no existe.");
  return hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    const t = (await c.query<{ label: string | null; app: string; provider: string }>(`select label, app, provider from push_tokens where id = $1 and user_id = $2 and revoked_at is null for update`, [tokenId, u.id])).rows[0];
    if (!t) return "Ese teléfono ya no recibe avisos.";
    await c.query(`update push_tokens set revoked_at = now(), revoked_reason = 'admin', revoked_by = $3 where id = $1 and user_id = $2`, [tokenId, u.id, s.id]);
    await auditar(c, { actor: s.id, action: "usuario.push.revocar", targetKind: "user", targetId: u.id, city: u.city_id, before: { avisos: `encendidos en ${t.label ?? "un teléfono"}` }, after: { avisos: "revocados", ref: { token: tokenId } }, reason: m });
    return null;
  }, "Ese teléfono ya no recibe avisos.");
}
