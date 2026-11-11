import "server-only";
import { createHash } from "node:crypto";
import { auditar, type Staff } from "../admin";
import { avisar } from "../avisos";
import { catalogoConfig, type FilaConfig } from "../config";
import { db, tx } from "../db";
import { olvidarCanales, origenVapid, llaveVapid, PROD } from "./llaves";

/* 8c · Super Admin del push (fase8-apps.md §4 8c «Super Admin»; regla 8, el espejo):
   - Sistema › Integraciones › Push: los tres canales con su interruptor (con motivo y auditoría), de dónde sale cada llave (sin mostrarla), los
     teléfonos con avisos por app y canal, la cola, lo de las últimas 24 h y los errores agrupados, la configuración con sus límites y «Mandar
     un push de prueba a mi teléfono» (pasa por avisar(), con su plantilla). SIN personas: solo cifras y códigos.
   - Notificaciones › Push: por plantilla, app y plataforma (7 días): entregados al proveedor, inválidos, abiertos desde el push y SMS ahorrados.
   - Usuarios 360° › Dispositivos: los teléfonos de UNA persona, enmascarados (rótulo, app, canal y los últimos 6 de la huella; nunca el token),
     y revocar uno con motivo (acciones-usuarios.ts). */

export const CANALES = [
  { k: "webpush", flag: "push.webpush", es: "Web Push (navegadores y la web instalada)", llave: "VAPID propia (sin cuenta de nadie)" },
  { k: "apns", flag: "push.apns", es: "Apple (APNs directo)", llave: "Apple · llave de avisos (.p8) del llavero" },
  { k: "fcm", flag: "push.fcm", es: "Android (FCM v1, solo mensajería)", llave: "Firebase · cuenta de servicio del llavero" },
] as const;
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function estadoPush() {
  const [F, L, T, C, R, E] = await Promise.all([
    db().query<{ key: string; enabled: boolean; note: string | null; at: string }>(`select key, enabled, note, ${ISO("updated_at")} as at from feature_flags where key like 'push.%'`),
    db().query<{ kind: string; meta: Record<string, string>; vence: string | null }>(`select kind, meta, to_char(expires_on, 'YYYY-MM-DD') as vence from store_secrets where kind in ('apns_key', 'fcm_service_account') and retired_at is null`),
    db().query<{ provider: string; app: string; n: number; n7: number }>(
      `select provider, app, count(*)::int as n, count(*) filter (where last_seen_at > now() - interval '7 days')::int as n7 from push_tokens where revoked_at is null group by 1, 2 order by 1, 2`),
    db().query<{ pendientes: number; enviando: number; reintentos: number; vieja_min: number | null }>(
      `select count(*) filter (where status = 'pendiente')::int as pendientes, count(*) filter (where status = 'enviando')::int as enviando,
              count(*) filter (where status = 'pendiente' and tries > 0)::int as reintentos,
              (extract(epoch from now() - min(created_at) filter (where status = 'pendiente')) / 60)::int as vieja_min
         from push_outbox where status in ('pendiente', 'enviando')`),
    db().query<{ provider: string; result: string; n: number }>(`select provider, result, count(*)::int as n from push_deliveries where at > now() - interval '1 day' group by 1, 2`),
    db().query<{ provider: string; code: string; n: number; ultimo: string }>(
      `select provider, coalesce(error_code, result) as code, count(*)::int as n, ${ISO("max(at)")} as ultimo
         from push_deliveries where at > now() - interval '1 day' and result not in ('enviado', 'pruebas') group by 1, 2 order by 3 desc limit 12`),
  ]);
  const llave = new Map(L.rows.map((x) => [x.kind, x]));
  const v = llaveVapid();
  const canales = CANALES.map((c) => {
    const f = F.rows.find((x) => x.key === c.flag), l = c.k === "apns" ? llave.get("apns_key") : c.k === "fcm" ? llave.get("fcm_service_account") : null;
    const lista = c.k === "webpush" ? true : !!l && (c.k === "fcm" || (!!l.meta.id_llave && !!l.meta.equipo));
    return { ...c, on: !!f?.enabled, nota: f?.note ?? null, at: f?.at ?? null, lista,
      detalle: c.k === "webpush" ? `Llave ${origenVapid() === "entorno" ? "del entorno (deploy)" : "derivada de la llave del entorno"} · huella ${createHash("sha256").update(v.publica).digest("hex").slice(0, 12)}`
        : l ? Object.entries(l.meta).map(([k, x]) => `${k.replace("_", " ")} ${x}`).join(" · ") + (l.vence ? ` · vence ${l.vence}` : "") : PROD ? "Falta la llave: no sale nada por este canal (el SMS de respaldo sí)." : "Falta la llave: queda «en modo pruebas» (no sale nada)." };
  });
  const cfg = (await catalogoConfig()).filter((x) => x.key.startsWith("push_"));
  return { canales, tokens: T.rows, cola: C.rows[0]!, dia: R.rows, errores: E.rows, cfg };
}
export type EstadoPushAdmin = Awaited<ReturnType<typeof estadoPush>> & { cfg: FilaConfig[] };

/* Encender o apagar un canal (solo Admin; lo revisa la acción). Apagado = no se encola por ahí y lo pendiente no sale (el SMS de respaldo sí). */
export async function cambiarCanal(s: Staff, canal: string, encender: boolean, motivo: string): Promise<{ ok: boolean; msg: string }> {
  const c = CANALES.find((x) => x.k === canal);
  if (!c) return { ok: false, msg: "Ese canal no existe." };
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  const r = await tx(async (cx) => {
    const a = (await cx.query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1 for update`, [c.flag])).rows[0];
    if (!a) return { ok: false, msg: "Ese interruptor no existe." };
    if (a.enabled === encender) return { ok: false, msg: encender ? "Ya está encendido." : "Ya está apagado." };
    await cx.query(`update feature_flags set enabled = $2, note = $4, updated_at = now(), updated_by = $3 where key = $1`, [c.flag, encender, s.id, m]);
    await auditar(cx, { actor: s.id, action: encender ? "push.canal.encender" : "push.canal.apagar", targetKind: "feature_flag", targetId: c.flag,
      before: { [c.es]: a.enabled ? "encendido" : "apagado" }, after: { [c.es]: encender ? "encendido" : "apagado" }, reason: m });
    return { ok: true, msg: encender ? `${c.es}: encendido.` : `${c.es}: apagado. Lo que iba por ahí sale por SMS de respaldo cuando aplica.` };
  });
  olvidarCanales();
  return r;
}

/* «Mandar un push de prueba a mi teléfono»: un aviso de verdad (plantilla push_prueba) a quien lo pide; dice a cuántos teléfonos va. */
export async function pushPrueba(s: Staff): Promise<{ ok: boolean; msg: string }> {
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from push_tokens where user_id = $1 and revoked_at is null`, [s.id])).rows[0]?.n ?? 0;
  await avisar(s.id, "push_prueba", {}, { href: "/avisos" });
  await tx((c) => auditar(c, { actor: s.id, action: "push.prueba", targetKind: "notif_template", targetId: "push_prueba", after: { a: "mi teléfono", telefonos: n } }));
  return n ? { ok: true, msg: `Mandado a tus ${n} ${n === 1 ? "teléfono o navegador" : "teléfonos y navegadores"} con avisos. También queda en tu campana.` }
    : { ok: true, msg: "No tienes ningún teléfono con avisos: quedó en tu campana. Enciéndelos en Mi cuenta › Avisos." };
}

/* Notificaciones › Push: cifras por plantilla, app y plataforma en 7 días (sin personas). */
export async function cifrasPush(cities: string[]) {
  const CIUD = "(cardinality($1::text[]) = 0 or city_id = any($1::text[]))";
  const [P, A, K] = await Promise.all([
    db().query<{ tpl: string; entregados: number; invalidos: number; fallidos: number; abiertos: number; ahorrados: number }>(
      `with d as (select tpl, sum(entregados)::int as entregados, sum(invalidos)::int as invalidos, sum(fallidos)::int as fallidos from push_cifras_dia where dia > current_date - 7 and ${CIUD} group by 1),
            n as (select tpl, count(*) filter (where opened_via = 'push')::int as abiertos, count(*) filter (where sms_status = 'ahorrado')::int as ahorrados
                    from notifications where created_at > now() - interval '7 days' and ${CIUD} and push_status <> 'no' group by 1)
       select coalesce(d.tpl, n.tpl) as tpl, coalesce(d.entregados, 0) as entregados, coalesce(d.invalidos, 0) as invalidos, coalesce(d.fallidos, 0) as fallidos,
              coalesce(n.abiertos, 0) as abiertos, coalesce(n.ahorrados, 0) as ahorrados
         from d full join n using (tpl) order by 2 desc, 1 limit 60`, [cities]),
    db().query<{ app: string; platform: string; entregados: number; invalidos: number }>(
      `select app, platform, sum(entregados)::int as entregados, sum(invalidos)::int as invalidos from push_cifras_dia where dia > current_date - 7 and ${CIUD} group by 1, 2 order by 3 desc`, [cities]),
    db().query<{ enviados: number; abiertos: number; ahorrados: number; respaldo: number; sin_app: number }>(
      `select count(*) filter (where push_status in ('enviado', 'pruebas'))::int as enviados, count(*) filter (where opened_via = 'push')::int as abiertos,
              count(*) filter (where sms_status = 'ahorrado')::int as ahorrados, count(*) filter (where sms_status in ('pruebas', 'pendiente', 'enviado') and push_status = 'fallo')::int as respaldo,
              count(*) filter (where push_status = 'sin_app')::int as sin_app
         from notifications where created_at > now() - interval '1 day' and ${CIUD}`, [cities]),
  ]);
  return { plantillas: P.rows, apps: A.rows, dia: K.rows[0]! };
}
export type CifrasPush = Awaited<ReturnType<typeof cifrasPush>>;

/* Usuarios 360° › Dispositivos (sin el token: rótulo, app, canal y los últimos 6 de su huella). */
export type DispositivoAdmin = { id: string; label: string; app: string; platform: string; provider: string; huella: string; desde: string; visto: string; ultimo: string | null; revocado: string | null; motivo: string | null; prueba: boolean };
export async function dispositivosDe(userId: string): Promise<DispositivoAdmin[]> {
  return (await db().query<DispositivoAdmin>(
    `select id::text, coalesce(label, platform) as label, app, platform, provider, right(token_hash, 6) as huella, ${ISO("created_at")} as desde, ${ISO("last_seen_at")} as visto,
            ${ISO("last_ok_at")} as ultimo, ${ISO("revoked_at")} as revocado, revoked_reason as motivo, is_test as prueba
       from push_tokens where user_id = $1 and (revoked_at is null or revoked_at > now() - interval '90 days') order by revoked_at is not null, last_seen_at desc limit 30`, [userId])).rows;
}
