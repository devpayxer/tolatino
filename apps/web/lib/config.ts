import "server-only";
import { auditar } from "./admin";
import { db, tx } from "./db";

/* 5i · Configuración global (fase5-comunidad.md §2 0105 y §4 5i; hueco #10). ÚNICO lugar de la app que lee o escribe un valor
   del catálogo `config_keys` (los plazos de la Comunidad y los diferidos de la Fase 4 viven en platform_config):
   - valor(k) / valores(...ks): el número acotado a [min, max] (el de fábrica si no hay fila), desde cfg_int() de la base, con
     una caché de 15 s por proceso que se vacía al guardar (otro proceso lo ve a más tardar en 15 s).
   - cfgSql(k): el mismo valor dentro de una consulta (`cfg_int('k')`, sin caché: lo que decide en la base).
   - cambiarConfig(): la única escritura. Revisa que la clave exista, que se pueda cambiar aquí, que sea un entero dentro de sus
     límites (la base lo vuelve a imponer con un trigger) y deja la AuditEntry con antes → después y el motivo, en la misma
     transacción. Lo llaman Configuración y las pantallas que ya tenían su editor (Auto-moderación, Gamification, Catálogo).
   El guardián configDesdeUnLugar vigila que nadie más lea platform_config para estas claves ni deje copias del valor en el
   código de la Comunidad; configConLimites, que cada clave tenga límites y que el servidor rechace lo que se sale. */
export type ClaveConfig =
  | "com_lim_publicaciones" | "com_lim_comentarios" | "com_lim_votos" | "com_lim_conversaciones" | "com_lim_reportes"
  | "com_editar_min" | "com_apelar_dias" | "com_encuesta_dias_max" | "com_traduccion_hora" | "com_resumen_hora" | "cup_dias_def"
  | "pts_tope_dia"
  | "sp_seguro_guardar_h" | "sp_total_escrito_dias" | "sp_notas_purga_dias" | "sp_fotos_ayuda_dias" | "ayuda_negocio_h"
  | "noche_responder_min" | "noche_mesa_guardada_min" | "noche_fila_viva_min"
  | "insc_responder_h" | "insc_oferta_h" | "insc_baja_h" | "ninos_purga_dias" | "insc_grupos_n" | "insc_grupos_dias"
  | "fe_responder_h" | "vis_responder_h" | "vis_paso_h" | "vis_purga_dias" | "lic_aviso_dias" | "dealer_doc_fee_cap_cents"
  // 6a · Eventos (0106)
  | "evt_revision_h" | "evt_fechas_max" | "evt_dias_adelante" | "evt_fotos_max" | "evt_dias_seguidos_max"
  // 6b · RSVP (0107)
  | "rsvp_guarda_min"
  // 6c · Boletos (0108)
  | "evt_apartado_min" | "evt_boletos_por_orden_max" | "evt_boletos_persona_fecha_max" | "evt_codigo_intentos_max" | "evt_apartados_vivos_max"
  // 6d · transferir, cancelar, lista de espera y cortesías
  | "bol_transferir_h" | "bol_cancelar_h" | "espera_oferta_min" | "evt_cortesias_max" | "bol_transferencias_dia_max"
  // 6e · cambios del evento y la liquidación del martes
  | "evt_aviso_max" | "evt_pago_dia" | "evt_retener_nuevo_cents" | "evt_cancelaciones_confianza" | "evt_cancelaciones_dias" | "evt_ajuste_dias" | "evt_cancelar_lote"
  // 6j · recordatorios, aviso de vendido y señales de Confianza (0115)
  | "evt_recordatorio_hora" | "evt_aforo_aviso_pct" | "evt_senal_ordenes_n" | "evt_senal_ordenes_min" | "evt_senal_cadena_n"
  // 6g · la puerta (0112)
  | "puerta_porteros_max" | "puerta_ventana_h" | "puerta_aforo_alerta_pct" | "puerta_buscar_min" | "puerta_invitar_dia_max"
  // 6h · la puerta sin conexión (0113)
  | "puerta_paquete_h" | "puerta_sync_seg" | "puerta_offline_aviso_min" | "puerta_sync_lote" | "puerta_reloj_desvio_seg"
  // 6i · evento privado (0114)
  | "evp_deposito_pct" | "evp_cancelar_h" | "evp_responder_h" | "evp_propuesta_h" | "evp_anticipacion_dias" | "evp_dias_adelante" | "evp_pendientes_max" | "evp_propuestas_max" | "evp_cambios_max"
  // 7a · El Compa: la ayuda como base (0116; las lee El Compa desde 7c)
  | "ayuda_trozos_max" | "ayuda_umbral_rank"
  // 7b · Soporte (0117)
  | "soporte_sla_h" | "soporte_dias" | "soporte_desde_h" | "soporte_hasta_h" | "soporte_casos_dia_max" | "soporte_devolver_max_cents" | "soporte_reabrir_dias"
  // 7c · El Compa: el motor, el tope y los límites (0118)
  | "compa_tope_mes_cents" | "compa_alerta_pct" | "compa_espera_ms" | "compa_salida_tokens" | "compa_msgs_hora" | "compa_msgs_dia" | "compa_turnos_max"
  | "compa_conv_cierra_h" | "compa_accion_min" | "compa_contexto_ops" | "compa_retener_meses"
  // 7f · Respuestas automáticas (0121)
  | "compa_auto_hilo_max" | "compa_auto_dia_negocio" | "compa_auto_espera_min"
  // 7g · El copiloto del equipo (0122)
  | "compa_copiloto_dia_staff"
  // 7h · WhatsApp y SMS con enlace (0123)
  | "compa_link_min" | "compa_canal_msgs_dia" | "compa_canal_respuesta_min" | "compa_canal_retener_dias" | "compa_canal_firma_seg"
  // 8a · Las cuatro apps: build mínimo y de aviso por app y plataforma (0125; se cambian en Sistema › Apps)
  | "app_min_build_cliente_ios" | "app_min_build_cliente_android" | "app_min_build_negocio_ios" | "app_min_build_negocio_android"
  | "app_min_build_delivery_ios" | "app_min_build_delivery_android" | "app_min_build_checkin_ios" | "app_min_build_checkin_android"
  | "app_aviso_build_cliente_ios" | "app_aviso_build_cliente_android" | "app_aviso_build_negocio_ios" | "app_aviso_build_negocio_android"
  | "app_aviso_build_delivery_ios" | "app_aviso_build_delivery_android" | "app_aviso_build_checkin_ios" | "app_aviso_build_checkin_android"
  // 8c · Push (0126; se cambian en Sistema › Integraciones › Push)
  | "push_ttl_h" | "push_reintentos" | "push_lote" | "push_por_minuto" | "push_inactivo_dias"
  // 8f · Errores, «Reportar un problema» y el programa beta (0127)
  | "errores_retener_dias" | "errores_por_minuto" | "errores_por_dispositivo" | "errores_pico_n" | "reporte_logs_kb" | "beta_agitar" | "apk_enlace_horas"
  // 8e · La ruta en vivo del repartidor (0128)
  | "ubic_cada_s" | "ubic_min_m" | "ubic_retener_dias" | "ubic_cliente_desde" | "ubic_vel_max_mps" | "ubic_vieja_s";

type Bi = { es: string; en: string };
const TTL_MS = 15_000;
let cache: { at: number; m: Map<string, number> } | null = null;

async function mapa(): Promise<Map<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.m;
  const r = await db().query<{ key: string; v: number }>(`select key, cfg_int(key) as v from config_keys`);
  cache = { at: Date.now(), m: new Map(r.rows.map((x) => [x.key, x.v])) };
  return cache.m;
}
export function olvidarConfig() { cache = null; }

/* El valor de una clave (acotado; el de fábrica si no hay fila). */
export async function valor(k: ClaveConfig): Promise<number> {
  const v = (await mapa()).get(k);
  if (v == null) throw new Error(`config: ${k} no está en config_keys`);
  return v;
}
export async function valores<K extends ClaveConfig>(...ks: K[]): Promise<Record<K, number>> {
  const m = await mapa(), out = {} as Record<K, number>;
  for (const k of ks) { const v = m.get(k); if (v == null) throw new Error(`config: ${k} no está en config_keys`); out[k] = v; }
  return out;
}
/* El mismo valor dentro de una consulta (lo decide la base en el momento, sin caché). */
export const cfgSql = (k: ClaveConfig) => `cfg_int('${k}')`;

/* ── Configuración (Super Admin › Sistema › Configuración) ── */
export type Seccion = "comunidad" | "gamificacion" | "salud_pro" | "noche" | "edu" | "fe_inm_autos" | "eventos" | "compa" | "soporte" | "apps";
export type FilaConfig = {
  key: ClaveConfig; seccion: Seccion; label: Bi; help: Bi | null; unidad: Bi; min: number; max: number; def: number; v: number; cambiado: boolean;
  editable: boolean; bloqueo: Bi | null; editIn: string | null; at: string | null; quien: string | null;
};
export async function catalogoConfig(): Promise<FilaConfig[]> {
  const r = await db().query<FilaConfig>(
    `select k.key, k.section as seccion, k.label, k.help, k.unit as unidad, k.min::float8 as min, k.max::float8 as max, k.def::float8 as def, cfg_int(k.key) as v,
            exists (select 1 from platform_config p where p.key = k.key) and cfg_int(k.key) <> k.def as cambiado, k.editable, k.bloqueo, k.edit_in as "editIn",
            to_char(a.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, a.quien
       from config_keys k
       left join lateral (select e.at, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
                            from audit_entries e left join users u on u.id::text = e.actor_id
                           where e.target_kind = 'platform_config' and e.target_id = k.key order by e.at desc limit 1) a on true
      order by k.sort, k.key`);
  return r.rows;
}
/* Lo que se dice del valor: «30 min», «$477.00». */
export const conUnidad = (k: string, v: number, u: Bi) => (k.endsWith("_cents") ? `$${(v / 100).toFixed(2)}` : `${v.toLocaleString("en-US")} ${u.es}`);

export type ResConfig = { ok: true; antes: number; v: number } | { ok: false; msg: string };
/* La única escritura de un valor del catálogo. `desde` = la pantalla que lo cambia (una clave con edit_in solo se cambia allí,
   porque esa pantalla hace algo más en la misma transacción: `tambien`). */
export async function cambiarConfig(actor: string, k: string, valorTxt: string | number, motivo: string,
  o: { desde?: string; tambien?: (c: import("pg").PoolClient, antes: number, v: number) => Promise<unknown> } = {}): Promise<ResConfig> {
  const m = (motivo ?? "").trim().slice(0, 500);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo." };
  const txt = String(valorTxt ?? "").trim().replace(/[,\s]/g, "");
  const v = Number(txt);
  const r = await tx(async (c): Promise<ResConfig> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`cfg:${k}`]);
    const x = (await c.query<{ min: number; max: number; label: Bi; unit: Bi; editable: boolean; bloqueo: Bi | null; edit_in: string | null; antes: number }>(
      `select min::float8 as min, max::float8 as max, label, unit, editable, bloqueo, edit_in, cfg_int(key) as antes from config_keys where key = $1`, [k])).rows[0];
    if (!x) return { ok: false, msg: "Ese valor no existe en la configuración." };
    if (!x.editable) return { ok: false, msg: `Todavía no se cambia aquí: ${x.bloqueo?.es ?? "un texto dice el número"}` };
    if (x.edit_in && o.desde !== x.edit_in) return { ok: false, msg: "Este valor se cambia en su pantalla (hace algo más al guardar)." };
    if (!txt || !Number.isFinite(v) || !Number.isInteger(v)) return { ok: false, msg: "Escribe un número entero." };
    if (v < x.min || v > x.max) return { ok: false, msg: `Entre ${conUnidad(k, x.min, x.unit)} y ${conUnidad(k, x.max, x.unit)}.` };
    if (v === x.antes) return { ok: false, msg: "Ya tiene ese valor." };
    await c.query(
      `insert into platform_config (key, value, note, updated_by, updated_at) values ($1, to_jsonb($2::int), $3, $4, now())
       on conflict (key) do update set value = excluded.value, note = excluded.note, updated_by = excluded.updated_by, updated_at = now()`,
      [k, v, x.label.es, actor]);
    await auditar(c, { actor, action: "config.cambiar", targetKind: "platform_config", targetId: k,
      before: { [x.label.es]: conUnidad(k, x.antes, x.unit) }, after: { [x.label.es]: conUnidad(k, v, x.unit) }, reason: m });
    if (o.tambien) await o.tambien(c, x.antes, v);
    return { ok: true, antes: x.antes, v };
  });
  if (r.ok) olvidarConfig();
  return r;
}
