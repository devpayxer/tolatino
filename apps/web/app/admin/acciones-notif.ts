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
    // 9l · El código para entrar: el texto se edita, pero sin {codigo} el SMS no serviría.
    if (String(key) === "cuenta_codigo" && !t.includes("{codigo}")) return { ok: false as const, mensaje: "El texto del código para entrar tiene que llevar {codigo}." };
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

/* 8c · El push de una plantilla (Notificaciones › Plantillas): va o no por push, texto genérico (Salud, Niños, Soporte, sanciones y cuenta no se
   pueden destapar: la base y esta acción lo impiden) y qué app lo abre. Permiso notif:editar, con motivo y auditoría antes → después. */
const APPS_PUSH = ["cliente", "negocio", "delivery", "checkin"] as const;
export async function plantillaPush(key: string, campo: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("notif", "editar")) return { ok: false, mensaje: "Tu rol no edita plantillas." };
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (!m) return { ok: false, mensaje: "Escribe el motivo del cambio." };
  if (!["push", "priv", "app"].includes(campo)) return { ok: false, mensaje: "Ese cambio no existe." };
  if (campo === "app" && !(APPS_PUSH as readonly string[]).includes(valor)) return { ok: false, mensaje: "Esa app no existe." };
  return tx(async (c) => {
    const p = (await c.query<{ push: boolean; priv: boolean; app: string; fija: boolean }>(
      `select push, push_private as priv, app, (key ~ '^(sal_|biz_sal_|nin_|ninos_|cuenta_)' or grp in ('support', 'mod')) as fija from notif_templates where key = $1 for update`, [String(key)])).rows[0];
    if (!p) return { ok: false as const, mensaje: "Esa plantilla no existe." };
    if (campo === "priv" && p.fija && valor !== "si") return { ok: false as const, mensaje: "Lo de Salud, Niños, Soporte, sanciones y cuenta siempre va con el texto genérico." };
    const col = campo === "push" ? "push" : campo === "priv" ? "push_private" : "app";
    const nuevo: string | boolean = campo === "app" ? valor : valor === "si";
    const antes: string | boolean = campo === "push" ? p.push : campo === "priv" ? p.priv : p.app;
    if (antes === nuevo) return { ok: false as const, mensaje: "Ya está así." };
    await c.query(`update notif_templates set ${col} = $2, edited_by = $3, updated_at = now() where key = $1`, [String(key), nuevo, s.id]);
    const etq = campo === "push" ? "Push" : campo === "priv" ? "Texto genérico" : "Abre en";
    const ver = (x: string | boolean) => (typeof x === "boolean" ? (x ? "sí" : "no") : x);
    await auditar(c, { actor: s.id, action: "notificaciones.push", targetKind: "notif_template", targetId: String(key), before: { [etq]: ver(antes) }, after: { [etq]: ver(nuevo) }, reason: m });
    return { ok: true as const, mensaje: "Guardado. Los avisos nuevos salen así." };
  });
}
