"use server";
/* 9k · Planes › Ingresos · Conciliación y alertas del dinero: «Me hago cargo», «Resuelta», «Reabrir» y «Conciliar otra vez» de un día; en las alertas,
   además, «Resolver a mano» (una devolución o una reversión atascada que se hizo fuera de Stripe; 9t7: también la devolución de lo que sobró, y siempre
   después de que el servidor le pregunte a Stripe). Permiso tx:aprobar, solo tus ciudades, con nota y en la
   auditoría (lib/conciliacion.ts, lib/dinero-alertas.ts). El servidor decide todo: aquí no entra ningún monto (9t6: tampoco «sí se cobró»: lo que se
   elige en una gateway_review lo comprueba el servidor contra la pasarela). */
import { staff } from "@/lib/admin";
import type { ResAdm } from "./acciones-colas";

export async function conciliacionNota(llave: string, accion: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  if (!["me_hago_cargo", "resuelta", "reabierta"].includes(String(accion)) || !/^[a-z_]+:[a-z_]+:[A-Za-z0-9_.:-]{1,200}$/.test(String(llave ?? ""))) return { ok: false, mensaje: "Esa diferencia no existe." };
  const r = await (await import("@/lib/conciliacion")).notaDiferencia(s, String(llave), accion as "me_hago_cargo" | "resuelta" | "reabierta", String(nota ?? ""));
  return r.ok ? { ok: true, mensaje: accion === "me_hago_cargo" ? "Es tuya. Quedó en la auditoría." : accion === "resuelta" ? "Resuelta. Quedó en la auditoría." : "Otra vez sin dueño." } : { ok: false, mensaje: r.msg };
}

export async function conciliarOtraVez(dia: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  const d = String(dia ?? "");
  // Los días de la conciliación son días UTC (los de Stripe): solo uno que ya terminó, según la base.
  const { db } = await import("@/lib/db");
  const hoyUtc = (await db().query<{ d: string }>(`select to_char((now() at time zone 'UTC')::date, 'YYYY-MM-DD') as d`)).rows[0]!.d;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d >= hoyUtc) return { ok: false, mensaje: "Elige un día que ya terminó." };
  if (String(motivo ?? "").trim().length < 4) return { ok: false, mensaje: "Escribe el motivo: queda en la auditoría." };
  // 20 nov · La auditoría entra con la corrida, en su transacción (alGuardar): antes se escribía aparte, después. Guardián auditoriaDelAdminConElCambio.
  const { auditar } = await import("@/lib/admin");
  const r = await (await import("@/lib/conciliacion")).conciliarDia(d, { por: "equipo", staffId: s.id },
    (c, g) => auditar(c, { actor: s.id, action: "conciliacion.correr", targetKind: "recon_day", targetId: d, after: { dia: d, resultado: g.estado === "cuadra" ? "cuadra" : g.estado === "fallo" ? "falló" : `${g.diferencias} diferencias`, ...(g.corrida ? { corrida: g.corrida } : {}) }, reason: String(motivo).trim().slice(0, 300) }));
  return { ok: true, mensaje: r.estado === "cuadra" ? `El ${d} cuadra.` : r.estado === "fallo" ? "La conciliación falló: Stripe no respondió. Prueba en un momento." : `El ${d} tiene ${r.diferencias} diferencia${r.diferencias === 1 ? "" : "s"} (${r.sinDueno} sin dueño).` };
}

/* 9t5 · «Preguntar a Stripe ahora» en una alerta «sin respuesta» (cobro de Pro, cobro con tarjeta guardada, transferencia al organizador): la misma función
   del barrido; la persona solo pide la consulta (con su nota en la auditoría), nunca dice «sí se cobró». Mismo permiso que las demás acciones del dinero. */
export async function alertaPreguntar(id: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  const r = await (await import("@/lib/dinero-alertas")).preguntarPorAlerta(s, String(id ?? ""), String(nota ?? ""));
  return r.ok ? { ok: true, mensaje: r.msg } : { ok: false, mensaje: r.msg };
}

/* 9t6 · «Elegir cuál vale» en una alerta gateway_review: la persona elige (un id de Stripe o «ninguno») con su nota; el servidor vuelve a preguntar a la
   pasarela, comprueba que el elegido está entre lo hallado y que el monto cuadra, decide una sola vez y devuelve lo que sobra (lib/revision-pasarela.ts).
   Mismo permiso que las demás acciones del dinero. */
export async function alertaDecidir(id: string, eleccion: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  const r = await (await import("@/lib/revision-pasarela")).decidirRevision(s, String(id ?? ""), String(eleccion ?? ""), String(nota ?? ""));
  return r.ok ? { ok: true, mensaje: r.msg } : { ok: false, mensaje: r.msg };
}

export async function alertaNota(id: string, accion: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  if (!["me_hago_cargo", "resuelta", "reabierta", "resuelta_a_mano"].includes(String(accion))) return { ok: false, mensaje: "Esa acción no existe." };
  const r = await (await import("@/lib/dinero-alertas")).notaAlerta(s, String(id ?? ""), accion as "me_hago_cargo" | "resuelta" | "reabierta" | "resuelta_a_mano", String(nota ?? ""));
  // 9t7 · «Resolver a mano» le pregunta antes a Stripe: si dice que salió, se cerró como hecha (el servidor lo dice en msg) y no se marcó a mano.
  return r.ok ? { ok: true, mensaje: r.msg ?? (accion === "resuelta_a_mano" ? "Resuelta fuera de Stripe: ya no se reintenta. Quedó en la auditoría." : "Listo. Quedó en la auditoría.") } : { ok: false, mensaje: r.msg };
}
