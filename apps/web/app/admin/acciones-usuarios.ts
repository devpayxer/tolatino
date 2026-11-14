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
    // 8d · Si el equipo cree que alguien entró a la cuenta, una llave que haya agregado esa persona tampoco sirve: se quitan todas (vuelve a
    // agregarlas la dueña después de entrar con el código).
    const llaves = await (await import("@/lib/llaves/llaves")).quitarTodasEn(c, u.id);
    await auditar(c, { actor: s.id, action: "usuario.verificacion.restablecer", targetKind: "user", targetId: u.id, city: u.city_id, before: { telefono: "verificado" }, after: { telefono: "pide código", ...(llaves ? { llaves: `${llaves} quitada${llaves === 1 ? "" : "s"}` } : {}) }, reason: m });
    return null;
  }, "Verificación restablecida. Sus sesiones se cerraron y sus llaves de acceso se quitaron.");
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

/* Exportar sus datos (pedido de privacidad): 9d · el MISMO archivo que la persona pide en Mi cuenta (por el mapa de datos: JSON + CSV + LEEME en un
   ZIP), para un pedido que llega por Soporte. Queda en la auditoría. */
export async function exportarDatos(id: string, motivo: string): Promise<ResAdm & { archivo?: string }> {
  let archivo = "";
  const r = await hacer(id, ["exportar"], motivo, async (c, s, u, m) => {
    const { armarZip, datosDeCuenta } = await import("@/lib/datos/exportar");
    const datos = await datosDeCuenta(u.id, c);
    archivo = armarZip(datos, false).toString("base64");
    await auditar(c, { actor: s.id, action: "usuario.exportar", targetKind: "user", targetId: u.id, city: u.city_id, after: { archivo: `ZIP por el mapa de datos (${datos.size} partes)` }, reason: m });
    return null;
  }, "Datos exportados. Quedó en la auditoría.", { borrada: true });
  return r.ok ? { ...r, archivo } : r;
}

/* 9d · «Ver como» (L189): lo que To'Latino guarda de la persona, tal como lo tiene, en SOLO LECTURA (las mismas partes de su archivo, las
   primeras filas de cada una). Nada se cambia; el motivo queda en la auditoría ANTES de ver. */
export async function verComo(id: string, motivo: string): Promise<ResAdm & { partes?: { k: string; n: number; filas: Record<string, unknown>[] }[] }> {
  let partes: { k: string; n: number; filas: Record<string, unknown>[] }[] = [];
  const r = await hacer(id, ["ver"], motivo, async (c, s, u, m) => {
    await auditar(c, { actor: s.id, action: "usuario.ver_como", targetKind: "user", targetId: u.id, city: u.city_id, after: { vista: "solo lectura" }, reason: m });
    const { datosDeCuenta } = await import("@/lib/datos/exportar");
    partes = [...(await datosDeCuenta(u.id, c))].filter(([, v]) => v.length).map(([k, v]) => ({ k, n: v.length, filas: v.slice(0, 3) }));
    return null;
  }, "Solo lectura. Quedó en la auditoría.", { borrada: true });
  return r.ok ? { ...r, partes } : r;
}

/* 9d · Fusionar cuentas (L186): una persona del equipo lo pide (aquí) y OTRA lo aplica en Colas › Cambios sensibles. Todo lo de ESTA cuenta pasa a
   la cuenta del teléfono que se escribe; esta queda fusionada (no entra). */
export async function pedirFusion(id: string, telefono: string, motivo: string): Promise<ResAdm> {
  return hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    if (u.staff) return "Es del equipo de To’Latino: se revisa desde Sistema › Equipo.";
    const t = String(telefono ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (!/^[2-9]\d{9}$/.test(t)) return "Escribe los 10 números del teléfono de la otra cuenta.";
    const h = (await c.query<{ id: string; status: string }>(`select id::text, status from users where phone = $1`, [`+1${t}`])).rows[0];
    if (!h) return "No hay una cuenta con ese teléfono.";
    if (h.id === u.id) return "Ese es el teléfono de esta misma cuenta.";
    if (["deleted_pending", "deleted", "merged"].includes(h.status)) return "La otra cuenta está borrada o fusionada.";
    if ((await c.query(`select 1 from sensitive_changes where type = 'mergeUser' and target_id = $1 and status = 'pending'`, [u.id])).rowCount) return "Ya hay un pedido de fusión en la cola.";
    const cs = (await c.query<{ id: string }>(
      `insert into sensitive_changes (type, target_kind, target_id, city_id, payload, reason, requested_by) values ('mergeUser', 'user', $1, $2, $3::jsonb, $4, $5) returning id`,
      [u.id, u.city_id, JSON.stringify({ into: h.id }), m, s.id])).rows[0]!;
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id) values ('cambio', 'sensitive_change', $1, $2)`, [cs.id, u.city_id]);
    await auditar(c, { actor: s.id, action: "usuario.fusion.pedir", targetKind: "user", targetId: u.id, city: u.city_id, after: { pedido: cs.id, hacia: h.id }, reason: m });
    return null;
  }, "En la cola de Cambios sensibles: lo aplica otra persona del equipo.");
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

/* 8d · Usuarios 360° › Seguridad › Llaves de acceso: revocar una llave de la persona (ya no entra con ella; sigue entrando con el código y puede
   agregar otra). usr:editar, con motivo; en la misma transacción: la llave, su cambio de cuenta, su libro y la auditoría. Después, el aviso crit
   cuenta_llave_quitada (sin interruptor). */
export async function llaveRevocar(id: string, llaveId: string, motivo: string): Promise<ResAdm> {
  if (typeof llaveId !== "string" || !/^\d{1,18}$/.test(llaveId)) return no("Esa llave no existe.");
  let nombre: string | null = null, quien = "";
  const r = await hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    nombre = await (await import("@/lib/llaves/llaves")).revocarEn(c, s.id, u.id, llaveId, m);
    if (!nombre) return "Esa llave ya no entra.";
    quien = u.id;
    await auditar(c, { actor: s.id, action: "usuario.llave.revocar", targetKind: "user", targetId: u.id, city: u.city_id, before: { llave: `viva en ${nombre}` }, after: { llave: "revocada", ref: { llave: llaveId } }, reason: m });
    return null;
  }, "Esa llave ya no entra a la cuenta. Le avisamos.");
  if (r.ok && nombre && quien) await (await import("@/lib/avisos")).avisar(quien, "cuenta_llave_quitada", { dispositivo: nombre, motivo: "la quitó el equipo de To'Latino" }, { href: "/cuenta/ajustes/privacidad", ref: ["passkey", llaveId] });
  return r;
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

/* 9n-3 · Enviar mensaje del equipo a una persona (AdminMessage): por la app (campana y push) o por SMS. usr:editar, con motivo interno, auditoría y la fila de
   admin_messages (solo inserción). Tope contra el abuso: 30 por hora por persona del equipo y 3 al día por destinatario (el SMS cuesta y molesta); el SMS pide
   el teléfono verificado. El texto va tal cual (sin enlaces: la persona ve lo que le llega en su cuenta). El aviso respeta STOP y las horas de silencio. */
const MSG_HORA = 30, MSG_DIA_DESTINO = 3;
export async function enviarMensaje(id: string, canal: string, texto: string, motivo: string, textoEn = ""): Promise<ResAdm> {
  if (canal !== "sms" && canal !== "push") return no("Elige por dónde se manda.");
  const t = motivoOk(texto).replace(/\s+/g, " ");
  const en = motivoOk(textoEn).replace(/\s+/g, " ") || t;
  if (t.length < 3) return no("Escribe el mensaje.");
  if (t.length > 280 || en.length > 280) return no("El mensaje es de hasta 280 letras.");
  if (/https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|co|io|us|app|link)\b/i.test(`${t} ${en}`)) return no("El mensaje no lleva enlaces: la persona ve lo que le llega en su cuenta.");
  let enviado = false;
  const r = await hacer(id, ["editar"], motivo, async (c, s, u, m) => {
    if (u.id === s.id) return "Eso no se manda a uno mismo.";
    if (canal === "sms" && !u.phone_ok) return "Su teléfono no está verificado: manda el mensaje por la app.";
    // El tope se cuenta DENTRO de la transacción y con la persona del equipo bloqueada: dos mensajes a la vez no se pasan del tope.
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`msg-equipo:${s.id}`]);
    const h = (await c.query<{ n: number }>(`select count(*)::int as n from admin_messages where by_staff = $1 and at > now() - interval '1 hour'`, [s.id])).rows[0]!.n;
    if (h >= MSG_HORA) return `Ya mandaste ${MSG_HORA} mensajes en la última hora. Espera un rato.`;
    const d = (await c.query<{ n: number }>(`select count(*)::int as n from admin_messages where target_kind = 'user' and target_id = $1 and at > now() - interval '1 day'`, [u.id])).rows[0]!.n;
    if (d >= MSG_DIA_DESTINO) return `A esta persona ya le llegaron ${MSG_DIA_DESTINO} mensajes del equipo hoy. Espera a mañana.`;
    await c.query(`insert into admin_messages (target_kind, target_id, city_id, channel, body, reason, by_staff) values ('user', $1, $2, $3, $4, $5, $6)`, [u.id, u.city_id, canal, t, m, s.id]);
    await auditar(c, { actor: s.id, action: "usuario.mensaje", targetKind: "user", targetId: u.id, city: u.city_id, after: { canal: canal === "sms" ? "SMS" : "App", mensaje: t.slice(0, 120) }, reason: m });
    enviado = true;
    return null;
  }, canal === "sms" ? "Mensaje enviado por SMS (y en su campana). Quedó en la auditoría." : "Mensaje enviado a su app. Quedó en la auditoría.");
  if (r.ok && enviado) {
    const { avisar } = await import("@/lib/avisos");
    await avisar(id, canal === "sms" ? "msg_equipo_sms" : "msg_equipo", { texto: t, texto_en: en }, { href: "/cuenta", ref: ["admin_message", id] });
  }
  return r;
}
