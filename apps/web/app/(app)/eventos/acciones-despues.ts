"use server";
/* 6d · Después de comprar (la orden, el boleto, recibir, la lista de espera). La pantalla manda códigos y números; nunca montos: lo que se
   devuelve lo calcula el servidor (lib/boletos-despues.ts). Cada escritura revisa que la llamada venga de nuestra página (mismoOrigen) y
   que haya sesión; todo va por la cuenta de quien llama (lo de otra persona no existe). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import type { Bi } from "@/lib/evt-comun";

type R<T = object> = ({ ok: true } & T) | { ok: false; msg?: Bi; entrar?: true };
const RED: Bi = { es: "No se pudo. Revisa tu conexión y prueba de nuevo.", en: "Could not do it. Check your connection and try again." };
async function quien() {
  if (!(await mismoOrigen())) return null;
  return yo();
}

export async function bolTransferir(code: string, telefono: string): Promise<R<{ a: string }>> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  return (await import("@/lib/boletos-despues")).transferir(u.id, String(code), String(telefono ?? ""));
}
export async function bolDeshacer(code: string): Promise<R> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  return (await import("@/lib/boletos-despues")).cancelarTransferencia(u.id, String(code));
}
export async function bolRecibir(token: string): Promise<R<{ codigo: string }>> {
  const u = await quien(); if (!u) return { ok: false, entrar: true };
  return (await import("@/lib/boletos-despues")).reclamar(u.id, String(token));
}
export async function bolNombre(code: string, nombre: string): Promise<R> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  return (await import("@/lib/boletos-despues")).cambiarNombre(u.id, String(code), nombre);
}
/* La hoja «Cancelar mis boletos»: lo que se devuelve lo dice el servidor (previo) y lo vuelve a calcular al confirmar. */
export async function bolPrevioCancelar(numero: string) {
  const u = await quien(); if (!u) return null;
  return (await import("@/lib/boletos-despues")).previoCancelar(u.id, String(numero), u.lang !== "en");
}
export async function bolCancelar(numero: string, codes: string[], clave: string): Promise<R<{ monto: number }>> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  return (await import("@/lib/boletos-despues")).cancelarBoletos(u.id, String(numero), codes, String(clave));
}
/* «No veo mis boletos»: un aviso en la cuenta con el enlace a la orden (sin SMS: los boletos viven en la app). */
export async function bolReenviarme(numero: string): Promise<R> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  if (!/^B-\d{1,10}$/.test(String(numero))) return { ok: false, msg: { es: "Esa orden no existe.", en: "That order does not exist." } };
  const { db } = await import("@/lib/db");
  const o = (await db().query<{ id: string; t: { es: string } }>(`select id::text, details->'title' as t from operations where number = $1 and kind = 'tickets' and user_id = $2 and pay_mode = 'app'`, [numero, u.id])).rows[0];
  if (!o) return { ok: false, msg: { es: "Esa orden no existe.", en: "That order does not exist." } };
  await db().query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) select id, operation_id, city_id, 'reenviado', $2, 'user' from tickets where operation_id = $1::bigint and holder_user_id = $2`, [o.id, u.id]);
  await (await import("@/lib/avisos")).avisar(u.id, "bol_reenviado", { evento: o.t.es }, { href: `/eventos/orden/${numero}`, ref: ["tickets", String(numero)] });
  return { ok: true };
}
/* Lista de espera. */
export async function esperaAnotar(fecha: string, personas: number): Promise<R<{ pos: number }>> {
  const u = await quien(); if (!u) return { ok: false, entrar: true };
  return (await import("@/lib/espera")).anotar(u.id, String(fecha), personas);
}
export async function esperaSalir(fecha: string): Promise<R> {
  const u = await quien(); if (!u) return { ok: false, msg: RED, entrar: true };
  return (await import("@/lib/espera")).salir(u.id, String(fecha));
}
