"use server";
/* 5i · Super Admin › Sistema › Configuración: cambiar un valor del catálogo (config_keys). Solo un Admin (como el prototipo: «Solo Admin
   cambia la configuración»). El servidor decide todo en cambiarConfig (lib/config.ts): que la clave exista y se cambie aquí, que sea un
   entero dentro de sus límites (la base lo vuelve a imponer) y la AuditEntry con antes → después y el motivo. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { cambiarConfig } from "@/lib/config";
import type { ResAdm } from "./acciones-colas";

const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");

export async function configCambiar(key: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("sys", "editar")) return { ok: false, mensaje: "Solo un Admin cambia la configuración." };
  if (typeof key !== "string" || !/^[a-z0-9_]{3,60}$/.test(key)) return { ok: false, mensaje: "Ese valor no existe en la configuración." };
  const r = await cambiarConfig(s.id, key, String(valor ?? ""), motivoOk(motivo));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  revalidatePath("/admin/sistema/configuracion");
  return { ok: true, mensaje: "Guardado. Aplica desde ahora en todas las ciudades y quedó en la auditoría." };
}
