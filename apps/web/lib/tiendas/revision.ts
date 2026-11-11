import "server-only";
import type { PoolClient } from "pg";
import { db } from "../db";
import { ENTORNO } from "../entorno";

/* 8i · Las cuentas de revisión de Apple y Google (fase8-apps.md §6 #24; guardián revisionAcotada). Es una superficie de entrada SIN SMS, así que
   está acotada por todos lados:
   - Solo un número que esté en review_accounts, solo con su fila ACTIVA y el interruptor app.revision.cuentas ENCENDIDO; en producción además
     con app.tiendas.publico (Fase 9). Cualquier otra cosa: el número sigue el camino normal (en producción, un SMS a un número de ficción).
   - El código es FIJO y vive en el entorno: code_ref es el NOMBRE de la variable, y solo se leen las cuatro REVISION_CODIGO_{APP} (nunca
     AUTH_SECRET ni otra). Se guarda como cualquier código: su huella HMAC para ESE teléfono, con los mismos topes de intentos y de pedidos,
     más revision_intentos_hora. Nunca sale por SMS ni en la pantalla del modo pruebas.
   - Al verificar se vuelve a revisar (desactivar la cuenta o apagar el interruptor la corta aunque ya tenga un código vigente).
   - No paga con tarjeta (pagoBloqueado en la pasarela; la base no le deja guardar tarjetas) y solo ve lo suyo (su negocio de revisión está
     oculto). Cada código pedido, entrada, rechazo y pago bloqueado queda en review_account_log (solo inserción). */
export const CODE_REF = /^REVISION_CODIGO_(CLIENTE|NEGOCIO|REPARTIDOR|PUERTA)$/;
export const FLAG_REVISION = "app.revision.cuentas";
type Cuenta = { id: number; app: string; active: boolean; code_ref: string };

/* El código fijo de una cuenta (del entorno), o null si el nombre no es uno de los cuatro o no hay un código de 6 dígitos. */
export function codigoFijo(codeRef: string): string | null {
  if (!CODE_REF.test(codeRef)) return null;
  const v = process.env[codeRef];
  return v && /^\d{6}$/.test(v) ? v : null;
}

/* ¿Las cuentas de revisión pueden entrar en este entorno, ahora? */
export async function revisionEncendida(c?: PoolClient): Promise<boolean> {
  const q = (c ?? db()) as PoolClient;
  const r = (await q.query<{ key: string; enabled: boolean }>(`select key, enabled from feature_flags where key in ($1, 'app.tiendas.publico')`, [FLAG_REVISION])).rows;
  const on = (k: string) => r.find((x) => x.key === k)?.enabled === true;
  if (!on(FLAG_REVISION)) return false;
  // En producción, las cuentas de revisión son de la Fase 9 (con el envío a revisión pública).
  if (ENTORNO === "produccion" && !on("app.tiendas.publico")) return false;
  return true;
}

/* ¿Ya es la Fase 9 (envío a revisión pública encendido)? En producción, las cuentas de revisión esperan eso. */
export async function faseNueve(): Promise<boolean> {
  return (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'app.tiendas.publico'`)).rows[0]?.enabled === true;
}

export async function cuentaDeTelefono(c: PoolClient, tel: string): Promise<Cuenta | null> {
  return (await c.query<Cuenta>(`select r.id, r.app, r.active, r.code_ref from review_accounts r join users u on u.id = r.user_id where u.phone = $1`, [tel])).rows[0] ?? null;
}

export async function anotar(c: PoolClient, cuenta: number, kind: "codigo" | "entro" | "rechazado" | "pago_bloqueado" | "activada" | "desactivada", motivo: string | null, ip: string | null, by: string | null = null) {
  await c.query(`insert into review_account_log (account_id, kind, motivo, ip, by_user) values ($1, $2, $3, $4::inet, $5)`, [cuenta, kind, motivo?.slice(0, 200) ?? null, ip, by]);
}

/* Para pedirCodigo: si el teléfono es de una cuenta de revisión que puede entrar ahora, su código fijo (y lo anota); si es de una cuenta que no
   puede, lo anota y el número sigue el camino normal; si no es de ninguna, null. «tope»: pidió demasiados en la hora. */
export async function codigoParaPedir(c: PoolClient, tel: string, ip: string | null): Promise<{ codigo: string } | "normal" | "tope" | null> {
  const r = await cuentaDeTelefono(c, tel);
  if (!r) return null;
  if (!r.active) { await anotar(c, r.id, "rechazado", "cuenta desactivada", ip); return "normal"; }
  if (!(await revisionEncendida(c))) { await anotar(c, r.id, "rechazado", "interruptor apagado", ip); return "normal"; }
  const codigo = codigoFijo(r.code_ref);
  if (!codigo) { await anotar(c, r.id, "rechazado", "sin el secreto en el entorno", ip); return "normal"; }
  const n = (await c.query<{ n: number }>(`select count(*)::int as n from review_account_log where account_id = $1 and kind = 'codigo' and at > now() - interval '1 hour'`, [r.id])).rows[0]!.n;
  if (n >= (await c.query<{ v: number }>(`select cfg_int('revision_intentos_hora') as v`)).rows[0]!.v) { await anotar(c, r.id, "rechazado", "tope de códigos por hora", ip); return "tope"; }
  await anotar(c, r.id, "codigo", null, ip);
  return { codigo };
}

/* Para verificarCodigo: un código del canal «revision» solo vale si la cuenta SIGUE activa y el interruptor SIGUE encendido. */
export async function codigoSigueValiendo(c: PoolClient, tel: string, ip: string | null): Promise<boolean> {
  const r = await cuentaDeTelefono(c, tel);
  if (!r) return false;
  if (!r.active || !(await revisionEncendida(c)) || !codigoFijo(r.code_ref)) { await anotar(c, r.id, "rechazado", !r.active ? "cuenta desactivada" : "interruptor apagado", ip); return false; }
  return true;
}

/* ¿Esta persona es una cuenta de revisión (activa o no)? */
export async function esCuentaRevision(userId: string): Promise<boolean> {
  return !!(await db().query(`select 1 from review_accounts where user_id = $1`, [userId])).rowCount;
}

/* La pasarela la llama antes de cobrar una tarjeta: una cuenta de revisión no paga (lo anota). Fuera de una petición (el barrido), null. */
export async function pagoBloqueado(): Promise<{ es: string; en: string } | null> {
  let id: string | null = null;
  try { id = (await (await import("../cuenta")).yo())?.id ?? null; } catch { return null; }
  if (!id) return null;
  const r = (await db().query<{ id: number }>(`select id from review_accounts where user_id = $1`, [id])).rows[0];
  if (!r) return null;
  await db().query(`insert into review_account_log (account_id, kind, motivo) values ($1, 'pago_bloqueado', 'intentó pagar con tarjeta')`, [r.id]);
  return { es: "Esta es una cuenta de revisión: no paga con tarjeta. Elige pagar en el local.", en: "This is a review account: it does not pay by card. Choose pay at the store." };
}
