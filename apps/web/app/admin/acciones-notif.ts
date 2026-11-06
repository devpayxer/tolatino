"use server";
/* ADM-NOTIF · editar el texto de una plantilla (ES o EN) y probarla en tu propio teléfono. Permiso notif:editar; todo queda
   en la auditoría con el antes y el después. Un texto nuevo solo usa las variables que la plantilla ya tenía. */
import { auditar, staff } from "@/lib/admin";
import { MUESTRA, variables } from "@/lib/admin-notif";
import { avisar } from "@/lib/avisos";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

export async function plantillaEditar(key: string, lang: "es" | "en", texto: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("notif", "editar")) return { ok: false, mensaje: "Tu rol no edita plantillas." };
  if (lang !== "es" && lang !== "en") return { ok: false, mensaje: "Idioma no válido." };
  const t = String(texto ?? "").replace(/\s+/g, " ").trim(), m = String(motivo ?? "").trim();
  if (!m) return { ok: false, mensaje: "Escribe el motivo del cambio." };
  if (t.length < 8) return { ok: false, mensaje: "El texto es muy corto." };
  return tx(async (c) => {
    const p = (await c.query<{ sms: boolean; body: { es: string; en: string } }>(`select sms, body from notif_templates where key = $1 for update`, [String(key)])).rows[0];
    if (!p) return { ok: false as const, mensaje: "Esa plantilla no existe." };
    const max = p.sms ? 160 : 300;
    if (t.length > max) return { ok: false as const, mensaje: `Máximo ${max} caracteres${p.sms ? " (también sale como SMS)" : ""}.` };
    const permitidas = new Set([...variables(p.body.es), ...variables(p.body.en)]), malas = variables(t).filter((v) => !permitidas.has(v));
    if (malas.length) return { ok: false as const, mensaje: `Esta plantilla no conoce ${malas.map((v) => `{${v}}`).join(", ")}. Usa: ${[...permitidas].map((v) => `{${v}}`).join(", ")}.` };
    if (t === p.body[lang]) return { ok: false as const, mensaje: "Es el mismo texto." };
    await c.query(`update notif_templates set body = jsonb_set(body, array[$2], to_jsonb($3::text)), edited_by = $4, updated_at = now() where key = $1`, [String(key), lang, t, s.id]);
    await auditar(c, { actor: s.id, action: "notificaciones.plantilla", targetKind: "notif_template", targetId: String(key), before: { [lang]: p.body[lang] }, after: { [lang]: t }, reason: m });
    return { ok: true as const, mensaje: "Guardada. Los avisos nuevos salen con este texto." };
  });
}

export async function plantillaProbar(key: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("notif", "editar")) return { ok: false, mensaje: "Tu rol no prueba plantillas." };
  await avisar(s.id, String(key), MUESTRA, { href: "/avisos" });
  await tx((c) => auditar(c, { actor: s.id, action: "notificaciones.probar", targetKind: "notif_template", targetId: String(key), after: { a: "mi teléfono" } }));
  return { ok: true, mensaje: "Enviada a tu bandeja. Mírala en la campana." };
}
