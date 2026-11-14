import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { db, tx } from "../db";
import { celda } from "../csv";
import { zip } from "../pases/zip";
import { columnasDePersona, ident, mapa, NUNCA_SE_EXPORTA } from "./mapa";

/* 9d · Descargar mis datos (vecino) y Exportar los datos del negocio (panel) (fase9-apertura.md §3.7, §6 #9, §1c «Exportar mis datos»).
   - Se pide con el código de entrada otra vez (propósito data_export; como borrar la cuenta). Uno vivo a la vez y uno cada export_cada_dias (7);
     cada pedido queda anotado (account_changes «export»; el del equipo, en la auditoría).
   - Lo arma el barrido (armarPendientes), en segundo plano: un ZIP con JSON y CSV legibles de cada archivo + LEEME.txt (ES/EN), al almacén
     PRIVADO (privado/exportes/<id>.zip). Aviso «Tu archivo está listo».
   - Se baja UNA vez, durante export_vence_h (24 h), solo por la persona que lo pidió (bajarExportacion; la ruta /api/datos/archivo/<id> solo
     con POST: un GET —la vista previa de un enlace— nunca lo gasta; guardián enlaceUnUsoSinGet). Bajado o vencido, el archivo sale del almacén.
   - La persona: lo que el MAPA dice que se exporta (exporta), solo sus filas (la columna de la persona = su id) y sin las columnas de OTRA persona
     ni huellas, cifrados, tokens o ubicación exacta (guardián exportaSoloLoSuyo).
   - El negocio: lo que su panel ya muestra (su página, catálogo, equipo, operaciones, cobros, clientes y reseñas con el nombre y la inicial),
     nunca un teléfono ni una dirección de un cliente. */

type Bi = { es: string; en: string };
export type ResExp = { ok: true; codigoPrueba?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResExp => ({ ok: false, msg: { es, en } });
const MAX_FILAS = 20_000;
type Fila = Record<string, unknown>;

/* Una fila legible: fechas en ISO, sin binarios, sin lo que nunca sale ni lo de otra persona. */
function limpiar(f: Fila, fuera: Set<string>): Fila {
  const o: Fila = {};
  for (const [k, v] of Object.entries(f)) {
    if (fuera.has(k) || NUNCA_SE_EXPORTA.test(k) || Buffer.isBuffer(v)) continue;
    o[k] = v instanceof Date ? v.toISOString() : v;
  }
  return o;
}
const aCsv = (filas: Fila[]) => {
  const cab = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  return [cab, ...filas.map((f) => cab.map((k) => f[k]))].map((l) => l.map(celda).join(",")).join("\r\n");
};

/* El archivo de una persona, por el mapa. Devuelve los archivos (nombre → filas). */
export async function datosDeCuenta(cuenta: string, c?: PoolClient): Promise<Map<string, Fila[]>> {
  const q = c ?? db();
  const M = await mapa(c), refs = await columnasDePersona(c);
  const out = new Map<string, Fila[]>();
  for (const f of M) {
    if (!f.exporta || f.rol !== "persona") continue;
    // Solo sus filas: la columna de la persona es su id. De OTRA persona no sale nada (sus columnas se quitan).
    const fuera = new Set([...(refs.get(f.tabla) ?? [])].filter((x) => x !== f.columna));
    if (f.tabla === "users") fuera.add("merged_into");
    const r = await q.query<Fila>(`select * from ${ident(f.tabla)} where ${ident(f.columna)} = $1::uuid limit ${MAX_FILAS}`, [cuenta]);
    out.set(f.exporta, r.rows.map((x) => limpiar(x, fuera)));
  }
  // Sus sanciones (el equipo las pone con target = su cuenta): qué, por qué y hasta cuándo; nunca quién del equipo ni sus notas.
  out.set("sanciones", (await q.query<Fila>(
    `select kind as tipo, reason as motivo, starts_at as desde, ends_at as hasta, lifted_at as levantada from sanctions where target_kind = 'user' and target_id = $1::text order by starts_at limit ${MAX_FILAS}`, [cuenta])).rows.map((x) => limpiar(x, new Set())));
  return out;
}

/* El archivo de un negocio: lo que su panel ya muestra. Ningún teléfono, correo ni dirección de un cliente; el cliente con su nombre y la inicial. */
export async function datosDeNegocio(negocio: string, c?: PoolClient): Promise<Map<string, Fila[]>> {
  const q = c ?? db();
  const L = async (s: string) => (await q.query<Fila>(s, [negocio])).rows.map((x) => limpiar(x, new Set()));
  const cliente = `nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1) || '.', '')), '')`;
  return new Map<string, Fila[]>([
    ["negocio", await L(`select id, name, category_id, subcategory_ids, city_id, status, operation, address, phone, whatsapp, email, instagram, facebook, languages, about, founded_year,
                                amenities, payment_modes, modules_on, created_at from businesses where id = $1`)],
    ["equipo", await L(`select display_name as nombre, kind as tipo, role as puesto, status as estado, languages as idiomas, since_year as desde, invited_at as invitado from business_members where business_id = $1 order by sort`)],
    ["catalogo", await L(`select i.* from items i where i.business_id = $1 order by i.id limit ${MAX_FILAS}`)],
    ["operaciones", await L(`select o.number as numero, o.kind as tipo, o.status as estado, o.mode as modo, o.sent_at as pedido, o.scheduled_at as para, o.done_at as terminado,
                                    o.cancelled_at as cancelado, o.subtotal_cents, o.delivery_cents, o.tip_cents, o.tax_cents, o.discount_cents, o.total_cents, o.pay_mode as pago,
                                    o.customer_note as nota_del_cliente, ${cliente} as cliente
                               from operations o join users u on u.id = o.user_id where o.business_id = $1 order by o.kind, o.sent_at desc limit ${MAX_FILAS}`)],
    ["cobros", await L(`select p.kind as tipo, p.method as forma, p.amount_cents, p.fee_cents, p.refunded_cents, p.status as estado, p.created_at as fecha, p.captured_at as cobrado,
                               o.number as operacion from payments p left join operations o on o.id = p.operation_id where p.business_id = $1 order by p.created_at desc limit ${MAX_FILAS}`)],
    ["clientes", await L(`select ${cliente} as cliente, o.kind as tipo, count(*)::int as operaciones, max(o.sent_at) as ultima, sum(o.total_cents)::int as total_cents
                            from operations o join users u on u.id = o.user_id where o.business_id = $1 group by u.id, u.first_name, u.last_name, o.kind order by max(o.sent_at) desc limit ${MAX_FILAS}`)],
    ["resenas", await L(`select r.stars as estrellas, case when r.status = 'visible' then r.body end as texto, r.reply as respuesta, r.created_at as fecha, r.status as estado, ${cliente} as cliente
                           from reviews r join users u on u.id = r.user_id where r.business_id = $1 order by r.created_at desc limit ${MAX_FILAS}`)],
  ]);
}

const LEEME = (negocio: boolean, archivos: Map<string, Fila[]>) => [
  negocio ? "To'Latino · Los datos de tu negocio / Your business data" : "To'Latino · Tus datos / Your data",
  "",
  negocio
    ? "ES · Esto es lo que tu panel muestra de tu negocio: tu página, tu catálogo, tu equipo, tus operaciones, tus cobros, tus clientes (nombre e inicial) y tus reseñas. Cada parte va dos veces: .json (completo) y .csv (para Excel o Google Sheets)."
    : "ES · Esto es lo que To'Latino guarda de ti: tu perfil, tus pedidos, citas y reservas, tus pagos, tus boletos, tus reseñas, tus publicaciones, tus mensajes y lo demás que hiciste. Cada parte va dos veces: .json (completo) y .csv (para Excel o Google Sheets). Lo de otras personas no viene aquí.",
  negocio
    ? "EN · This is what your dashboard shows about your business: your page, catalog, team, operations, payouts, clients (first name and initial) and reviews. Each part comes twice: .json (complete) and .csv (for Excel or Google Sheets)."
    : "EN · This is what To'Latino keeps about you: your profile, orders, appointments and bookings, payments, tickets, reviews, posts, messages and the rest of what you did. Each part comes twice: .json (complete) and .csv (for Excel or Google Sheets). Other people's data is not included.",
  "",
  "ES · Las cantidades terminadas en _cents están en centavos de dólar. Las fechas están en UTC (ISO 8601).",
  "EN · Amounts ending in _cents are in US cents. Dates are in UTC (ISO 8601).",
  "",
  ...[...archivos].map(([k, v]) => `${k}: ${v.length}`),
  "",
].join("\r\n");

/* El ZIP: LEEME + JSON + CSV de cada archivo. */
export function armarZip(archivos: Map<string, Fila[]>, negocio: boolean): Buffer {
  const A: [string, Buffer][] = [["LEEME.txt", Buffer.from(LEEME(negocio, archivos), "utf8")]];
  for (const [k, v] of archivos) {
    A.push([`${k}.json`, Buffer.from(JSON.stringify(v, null, 2), "utf8")]);
    A.push([`${k}.csv`, Buffer.from(aCsv(v), "utf8")]);
  }
  return zip(A);
}

/* ── Pedir el archivo (la persona o el dueño del negocio) ── */
export async function pedirCodigoArchivo(tel: string): Promise<ResExp> {
  const { pedirCodigo, ErrorCuenta } = await import("../cuenta");
  try { const r = await pedirCodigo(tel, "data_export"); return { ok: true, codigoPrueba: r.codigoPrueba }; }
  catch (e) {
    const k = e instanceof ErrorCuenta ? e.codigo : "";
    return k === "espera" ? no("Espera un momento para pedir otro código.", "Wait a moment to ask for another code.")
      : k === "demasiados" ? no("Demasiados intentos. Pide un código nuevo en un rato.", "Too many tries. Ask for a new code in a while.")
      : no("No pudimos mandar el código ahora. Prueba más tarde.", "We could not send the code right now. Try later.");
  }
}
const fecha = (iso: Date, en: boolean) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "long" }).format(iso);
export async function pedirArchivo(u: { id: string; phone: string }, codigo: string, negocio: string | null): Promise<ResExp> {
  const { consumirCodigo } = await import("../cuenta");
  return tx(async (c): Promise<ResExp> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`export:${u.id}:${negocio ?? ""}`]);
    const v = await consumirCodigo(c, u.phone, "data_export", String(codigo ?? ""));
    if (v === "codigo_incorrecto") return no("Ese código no es. Revísalo.", "That code is not right. Check it.");
    if (v === "codigo_vencido") return no("El código venció. Pide uno nuevo.", "The code expired. Ask for a new one.");
    if (v === "demasiados") return no("Demasiados intentos. Pide un código nuevo en un rato.", "Too many tries. Ask for a new code in a while.");
    if (negocio && !(await c.query(`select 1 from business_members where business_id = $1 and user_id = $2::uuid and kind = 'owner' and status = 'active'`, [negocio, u.id])).rowCount)
      return no("Solo el dueño exporta los datos del negocio.", "Only the owner exports the business data.");
    const viva = (await c.query(`select 1 from data_exports where user_id = $1::uuid and coalesce(business_id, '') = $2::text and status in ('pendiente', 'armando', 'listo')`, [u.id, negocio ?? ""])).rowCount;
    if (viva) return no("Ya pediste un archivo: lo ves aquí cuando esté listo.", "You already requested a file: you will see it here when it is ready.");
    const ult = (await c.query<{ otro: Date | null }>(
      `select max(requested_at) + make_interval(days => cfg_int('export_cada_dias')) as otro from data_exports
        where user_id = $1::uuid and coalesce(business_id, '') = $2::text and status <> 'fallo'`, [u.id, negocio ?? ""])).rows[0]?.otro;
    if (ult && ult.getTime() > Date.now()) return no(`Puedes pedir otro archivo el ${fecha(ult, false)}.`, `You can request another file on ${fecha(ult, true)}.`);
    await c.query(`insert into data_exports (user_id, business_id, is_test) values ($1::uuid, $2::text, (select is_test from users where id = $1::uuid))`, [u.id, negocio]);
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1::uuid, 'export', null, $2::text, 'user')`, [u.id, negocio ? `negocio:${negocio}` : "cuenta"]);
    return { ok: true };
  });
}

/* Lo que la pantalla muestra: el último archivo y cuándo se puede pedir otro. */
export type Exportacion = { id: string; estado: "pendiente" | "armando" | "listo" | "bajado" | "vencido" | "fallo"; pedido: string; listo: string | null; vence: string | null; bajado: string | null; bytes: number | null; otro: string | null };
export async function misArchivos(userId: string, negocio: string | null): Promise<Exportacion[]> {
  return (await db().query<Exportacion>(
    `select id::text, case when status = 'listo' and expires_at <= now() then 'vencido' else status end as estado,
            to_char(requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pedido, to_char(ready_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as listo,
            to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence, to_char(downloaded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as bajado, bytes,
            to_char((requested_at + make_interval(days => cfg_int('export_cada_dias'))) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as otro
       from data_exports where user_id = $1::uuid and coalesce(business_id, '') = $2::text order by requested_at desc limit 5`, [userId, negocio ?? ""])).rows;
}

/* ── El barrido: armar los pedidos y sacar del almacén lo bajado o vencido ── */
export async function armarPendientes(max = 3): Promise<number> {
  const { guardarObjeto, mediosListos } = await import("../medios");
  if (!mediosListos()) return 0; // sin almacén privado no se arma nada (el pedido espera)
  let n = 0;
  for (let i = 0; i < max; i++) {
    const e = (await db().query<{ id: string; user_id: string; business_id: string | null }>(
      `update data_exports set status = 'armando' where id = (select id from data_exports where status = 'pendiente' order by requested_at limit 1 for update skip locked)
       returning id::text, user_id::text, business_id`)).rows[0];
    if (!e) break;
    try {
      const archivos = e.business_id ? await datosDeNegocio(e.business_id) : await datosDeCuenta(e.user_id);
      const z = armarZip(archivos, !!e.business_id), clave = `privado/exportes/${e.id}.zip`;
      await guardarObjeto(clave, z, "application/zip");
      await db().query(
        `update data_exports set status = 'listo', media_key = $2, sha256 = $3, bytes = $4::int, sections = $5::jsonb, ready_at = now(), expires_at = now() + make_interval(hours => cfg_int('export_vence_h'))
          where id = $1::uuid and status = 'armando'`,
        [e.id, clave, createHash("sha256").update(z).digest("hex"), z.length, JSON.stringify(Object.fromEntries([...archivos].map(([k, v]) => [k, v.length])))]);
      const { avisar } = await import("../avisos");
      if (e.business_id) {
        const nb = (await db().query<{ name: string }>(`select name from businesses where id = $1`, [e.business_id])).rows[0]?.name ?? "";
        await avisar(e.user_id, "datos_export_negocio", { negocio: nb }, { href: `/panel/${e.business_id}/exportar`, ref: ["data_export", e.id] });
      } else await avisar(e.user_id, "datos_export_listo", {}, { href: "/cuenta/ajustes/privacidad/datos", ref: ["data_export", e.id] });
      n++;
    } catch (err) {
      await db().query(`update data_exports set status = 'fallo', error = $2 where id = $1::uuid and status = 'armando'`, [e.id, String((err as Error)?.message ?? err).slice(0, 300)]);
    }
  }
  return n;
}
export async function vencerExportaciones(): Promise<number> {
  const { borrarObjeto, mediosListos } = await import("../medios");
  const V = (await db().query<{ id: string; media_key: string }>(
    `select id::text, media_key from data_exports where media_key is not null and file_gone_at is null and (status = 'bajado' or expires_at <= now()) limit 50`)).rows;
  for (const v of V) {
    if (mediosListos()) await borrarObjeto(v.media_key);
    await db().query(`update data_exports set file_gone_at = now(), status = case when status = 'listo' then 'vencido' else status end where id = $1::uuid`, [v.id]);
  }
  // Un pedido que se quedó «armando» (el proceso se cayó) vuelve a la fila.
  await db().query(`update data_exports set status = 'pendiente' where status = 'armando' and requested_at < now() - interval '30 minutes'`);
  return V.length;
}

/* ── Bajar el archivo (POST /api/datos/archivo/<id>): solo quien lo pidió, una vez, antes de que venza ── */
export type ResBajar = { ok: true; zip: Buffer; nombre: string } | { ok: false; status: 404 | 410 };
export async function bajarExportacion(id: string, userId: string, ip: string | null): Promise<ResBajar> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, status: 404 };
  const e = (await db().query<{ media_key: string | null; status: string; vence: boolean; business_id: string | null }>(
    `select media_key, status, expires_at > now() as vence, business_id from data_exports where id = $1::uuid and user_id = $2::uuid`, [id, userId])).rows[0];
  // De otra persona (o no existe): 404, igual que si no existiera.
  if (!e) return { ok: false, status: 404 };
  if (e.status !== "listo" || !e.vence || !e.media_key) return { ok: false, status: 410 };
  // El negocio: quien lo pidió sigue siendo su dueño.
  if (e.business_id && !(await db().query(`select 1 from business_members where business_id = $1 and user_id = $2::uuid and kind = 'owner' and status = 'active'`, [e.business_id, userId])).rowCount)
    return { ok: false, status: 404 };
  const { leerObjeto } = await import("../medios");
  const z = await leerObjeto(e.media_key);
  // Un uso: gana el primero (dos pedidos a la vez: el segundo ve 410).
  const ipHash = ip ? createHash("sha256").update(`ip:${ip}`).digest("hex") : null;
  const r = await db().query(`update data_exports set status = 'bajado', downloaded_at = now(), ip_hash = $3 where id = $1::uuid and user_id = $2::uuid and status = 'listo' and expires_at > now()`, [id, userId, ipHash]);
  if (!r.rowCount) return { ok: false, status: 410 };
  return { ok: true, zip: z, nombre: e.business_id ? `tolatino-negocio-${e.business_id}.zip` : "tolatino-mis-datos.zip" };
}

/* ── Usuarios 360° › Privacidad: sus archivos (sin contenido) ── */
export async function archivosDe(userId: string) {
  return (await db().query<{ id: string; negocio: string | null; estado: string; pedido: string; bajado: string | null; bytes: number | null; equipo: string | null }>(
    `select e.id::text, e.business_id as negocio, case when e.status = 'listo' and e.expires_at <= now() then 'vencido' else e.status end as estado,
            to_char(e.requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pedido, to_char(e.downloaded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as bajado,
            e.bytes, nullif(trim(coalesce(s.first_name, '') || ' ' || left(coalesce(s.last_name, ''), 1)), '') as equipo
       from data_exports e left join users s on s.id = e.requested_by where e.user_id = $1::uuid order by e.requested_at desc limit 10`, [userId])).rows;
}
