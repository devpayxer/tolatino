"use server";
/* 9k · Planes › Ingresos · Conciliación y alertas del dinero: «Me hago cargo», «Resuelta», «Reabrir» y «Conciliar otra vez» de un día; en las alertas,
   además, «Resolver a mano» (una devolución o una reversión atascada que se hizo fuera de Stripe). Permiso tx:aprobar, solo tus ciudades, con nota y en la
   auditoría (lib/conciliacion.ts, lib/dinero-alertas.ts). El servidor decide todo: aquí no entra ningún monto. */
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
  const r = await (await import("@/lib/conciliacion")).conciliarDia(d, { por: "equipo", staffId: s.id });
  const { auditar } = await import("@/lib/admin");
  const { tx } = await import("@/lib/db");
  await tx((c) => auditar(c, { actor: s.id, action: "conciliacion.correr", targetKind: "recon_day", targetId: d, after: { dia: d, resultado: r.estado === "cuadra" ? "cuadra" : r.estado === "fallo" ? "falló" : `${r.diferencias} diferencias` }, reason: String(motivo).trim().slice(0, 300) }));
  return { ok: true, mensaje: r.estado === "cuadra" ? `El ${d} cuadra.` : r.estado === "fallo" ? "La conciliación falló: Stripe no respondió. Prueba en un momento." : `El ${d} tiene ${r.diferencias} diferencia${r.diferencias === 1 ? "" : "s"} (${r.sinDueno} sin dueño).` };
}

export async function alertaNota(id: string, accion: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };
  if (!["me_hago_cargo", "resuelta", "reabierta", "resuelta_a_mano"].includes(String(accion))) return { ok: false, mensaje: "Esa acción no existe." };
  const r = await (await import("@/lib/dinero-alertas")).notaAlerta(s, String(id ?? ""), accion as "me_hago_cargo" | "resuelta" | "reabierta" | "resuelta_a_mano", String(nota ?? ""));
  return r.ok ? { ok: true, mensaje: accion === "resuelta_a_mano" ? "Resuelta fuera de Stripe: ya no se reintenta. Quedó en la auditoría." : "Listo. Quedó en la auditoría." } : { ok: false, mensaje: r.msg };
}
