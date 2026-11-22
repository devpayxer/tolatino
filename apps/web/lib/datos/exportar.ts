import "server-only";
import { createHash } from "node:crypto";
import { closeSync, openSync, writeSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PoolClient } from "pg";
import { db, tx } from "../db";
import { celda } from "../csv";
import { zipPorPartes } from "../pases/zip";
import { banderasDeNotas, columnaInterna, columnasDePersona, ident, mapa, notaSale, NUNCA_SE_EXPORTA } from "./mapa";
import type { PruebaLlave } from "../llaves/llaves";

/* 9d · Descargar mis datos (vecino) y Exportar los datos del negocio (panel) (fase9-apertura.md §3.7, §6 #9, §1c «Exportar mis datos»).
   - Se pide con el código de entrada otra vez (propósito data_export; como borrar la cuenta). Uno vivo a la vez y uno cada export_cada_dias (7);
     cada pedido queda anotado (account_changes «export»; el del equipo, en la auditoría).
   - Lo arma el barrido (armarPendientes), en segundo plano: un ZIP con JSON y CSV legibles de cada archivo + LEEME.txt (ES/EN), al almacén
     PRIVADO (privado/exportes/<id>.zip). Aviso «Tu archivo está listo».
   - Se baja UNA vez, durante export_vence_h (24 h), solo por la persona que lo pidió (bajarExportacion; la ruta /api/datos/archivo/<id> solo
     con POST: un GET —la vista previa de un enlace— nunca lo gasta; guardián enlaceUnUsoSinGet). Bajado o vencido, el archivo sale del almacén.
   - 22 nov · En flujo (la misma clase que los medios en flujo): el ZIP se escribe por partes a un archivo temporal y sube desde el disco
     (guardarArchivo), y se entrega del almacén a quien lo baja por partes (abrirObjeto), nunca entero en la memoria del proceso (antes: el ZIP
     entero al armarlo, y al bajarlo leerObjeto + una copia; 51,6 MB pedían ~240 MB). Guardián exportacionEnFlujo.
   - La persona: lo que el MAPA dice que se exporta (exporta), solo sus filas (la columna de la persona = su id) y sin las columnas de OTRA persona
     ni huellas, cifrados, tokens o ubicación exacta (guardián exportaSoloLoSuyo).
   - El negocio: lo que su panel ya muestra (su página, catálogo, equipo, operaciones, cobros, clientes y reseñas con el nombre y la inicial),
     nunca un teléfono ni una dirección de un cliente. */

type Bi = { es: string; en: string };
export type ResExp = { ok: true; codigoPrueba?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResExp => ({ ok: false, msg: { es, en } });
/* 9t · Sin corte: cada archivo sale entero, en partes de PARTE filas (operaciones.csv si cabe en una; operaciones-1.csv, -2… si no). Se lee con un
   cursor de la base, de PARTE en PARTE, y cada parte se comprime al llegar: en memoria solo hay una parte cruda a la vez y lo ya comprimido.
   TOPE_PARTES es solo un freno contra un archivo desbocado (2 000 000 de filas en un archivo: ninguna cuenta real llega); si se alcanza, el LEEME
   lo dice con el número exacto que quedó fuera y el equipo lo ve en Usuarios 360° (sections). */
const PARTE = 20_000, TOPE_PARTES = 100;
type Fila = Record<string, unknown>;
/* tabla: la de un «select *» (las notas y motivos de esa tabla salen según NOTAS de lib/datos/mapa.ts; 9u-2). */
export type Consulta = { nombre: string; sql: string; args: unknown[]; fuera: Set<string>; tabla?: string };

/* Una fila legible: fechas en ISO, sin binarios, sin lo que nunca sale ni lo de otra persona, y sin las notas internas del equipo (9u-2: una nota
   «interna» o sin clasificar no sale; una que sale solo en ciertas filas va vacía en las demás: la bandera «__sale__<col>» la pone la consulta). */
function limpiar(f: Fila, fuera: Set<string>, tabla?: string): Fila {
  const o: Fila = {};
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("__sale__") || fuera.has(k) || NUNCA_SE_EXPORTA.test(k) || Buffer.isBuffer(v)) continue;
    if (tabla && columnaInterna(tabla, k)) continue; // 22 nov · «internas» del mapa de datos (el nombre de búsqueda de la puerta, la ruta de la copia de revisión)
    const s = tabla ? notaSale(tabla, k) : true;
    if (s === false) continue;
    if (typeof s === "string" && f[`__sale__${k}`] !== true) { o[k] = null; continue; }
    o[k] = v instanceof Date ? v.toISOString() : v;
  }
  return o;
}
const aCsv = (filas: Fila[]) => {
  const cab = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  return [cab, ...filas.map((f) => cab.map((k) => f[k]))].map((l) => l.map(celda).join(",")).join("\r\n");
};

/* El archivo de una persona, por el mapa: las consultas (nombre → SQL). Solo sus filas; sin las columnas de otra persona. */
export async function datosDeCuenta(cuenta: string, c?: PoolClient): Promise<Consulta[]> {
  const M = await mapa(c), refs = await columnasDePersona(c);
  const out: Consulta[] = [];
  for (const f of M) {
    if (!f.exporta || f.rol !== "persona") continue;
    // Solo sus filas: la columna de la persona es su id. De OTRA persona no sale nada (sus columnas se quitan).
    const fuera = new Set([...(refs.get(f.tabla) ?? [])].filter((x) => x !== f.columna));
    if (f.tabla === "users") fuera.add("merged_into");
    out.push({ nombre: f.exporta, sql: `select *${banderasDeNotas(f.tabla)} from ${ident(f.tabla)} where ${ident(f.columna)} = $1::uuid`, args: [cuenta], fuera, tabla: f.tabla });
  }
  // Sus sanciones (el equipo las pone con target = su cuenta): qué, por qué y hasta cuándo; nunca quién del equipo ni sus notas.
  out.push({ nombre: "sanciones", sql: `select kind as tipo, reason as motivo, starts_at as desde, ends_at as hasta, lifted_at as levantada from sanctions where target_kind = 'user' and target_id = $1::text order by starts_at`, args: [cuenta], fuera: new Set() });
  return out;
}

/* El archivo de un negocio: lo que su panel ya muestra. Ningún teléfono, correo ni dirección de un cliente; el cliente con su nombre y la inicial. */
export function datosDeNegocio(negocio: string): Consulta[] {
  const L = (nombre: string, sql: string, tabla?: string, fuera: string[] = []): Consulta => ({ nombre, sql, args: [negocio], fuera: new Set(fuera), tabla });
  const cliente = `nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1) || '.', '')), '')`;
  return [
    L("negocio", `select id, name, category_id, subcategory_ids, city_id, status, operation, address, phone, whatsapp, email, instagram, facebook, languages, about, founded_year,
                         amenities, payment_modes, modules_on, created_at from businesses where id = $1`),
    L("equipo", `select display_name as nombre, kind as tipo, role as puesto, status as estado, languages as idiomas, since_year as desde, invited_at as invitado from business_members where business_id = $1 order by sort`),
    // 9u-2 · items: sus notas según NOTAS (el motivo de un plato oculto sale solo mientras está oculto: lo que el panel le muestra). 22 nov · Sin
    // hidden_by: quién del equipo lo ocultó (una cuenta del equipo) no sale; el Panel tampoco lo dice.
    L("catalogo", `select i.*${banderasDeNotas("items")} from items i where i.business_id = $1 order by i.id`, "items", ["hidden_by"]),
    L("operaciones", `select o.number as numero, o.kind as tipo, o.status as estado, o.mode as modo, o.sent_at as pedido, o.scheduled_at as para, o.done_at as terminado,
                             o.cancelled_at as cancelado, o.subtotal_cents, o.delivery_cents, o.tip_cents, o.tax_cents, o.discount_cents, o.total_cents, o.pay_mode as pago,
                             o.customer_note as nota_del_cliente, ${cliente} as cliente
                        from operations o join users u on u.id = o.user_id where o.business_id = $1 order by o.kind, o.sent_at desc, o.id`),
    L("cobros", `select p.kind as tipo, p.method as forma, p.amount_cents, p.fee_cents, p.refunded_cents, p.status as estado, p.created_at as fecha, p.captured_at as cobrado,
                        o.number as operacion from payments p left join operations o on o.id = p.operation_id where p.business_id = $1 order by p.created_at desc, p.id`),
    L("clientes", `select ${cliente} as cliente, o.kind as tipo, count(*)::int as operaciones, max(o.sent_at) as ultima, sum(o.total_cents)::int as total_cents
                     from operations o join users u on u.id = o.user_id where o.business_id = $1 group by u.id, u.first_name, u.last_name, o.kind order by max(o.sent_at) desc`),
    L("resenas", `select r.stars as estrellas, case when r.status = 'visible' then r.body end as texto, r.reply as respuesta, r.created_at as fecha, r.status as estado, ${cliente} as cliente
                    from reviews r join users u on u.id = r.user_id where r.business_id = $1 order by r.created_at desc, r.id`),
  ];
}

/* Leer una consulta de PARTE en PARTE con un cursor (dentro de la transacción de c). Cada tanda sale limpia. */
async function* porPartes(c: PoolClient, q: Consulta, n: number, tam = PARTE): AsyncGenerator<Fila[]> {
  const cur = `exp_${n}`;
  // nosemgrep: tolatino-sql-con-texto-interpolado — q.sql sale solo de datosDeCuenta/datosDeNegocio (consultas fijas o identificadores del mapa con ident())
  await c.query(`declare ${cur} no scroll cursor for ${q.sql}`, q.args);
  try {
    for (;;) {
      // nosemgrep: tolatino-sql-con-texto-interpolado — cur = «exp_» + un número del propio bucle; tam = PARTE (número)
      const r = await c.query<Fila>(`fetch forward ${tam} from ${cur}`);
      if (r.rows.length) yield r.rows.map((x) => limpiar(x, q.fuera, q.tabla));
      if (r.rows.length < tam) break;
    }
  } finally {
    // nosemgrep: tolatino-sql-con-texto-interpolado — cur = «exp_» + un número del propio bucle
    await c.query(`close ${cur}`);
  }
}

/* Lo que el equipo ve con «Ver como»: las primeras filas de cada parte y cuántas hay (sin armar nada). */
export async function vistaPrevia(consultas: Consulta[], c: PoolClient, filas = 3): Promise<{ k: string; n: number; filas: Fila[] }[]> {
  const out: { k: string; n: number; filas: Fila[] }[] = [];
  for (const q of consultas) {
    // nosemgrep: tolatino-sql-con-texto-interpolado — q.sql sale solo de datosDeCuenta/datosDeNegocio
    const n = Number((await c.query<{ n: string }>(`select count(*) as n from (${q.sql}) t`, q.args)).rows[0]?.n ?? 0);
    // nosemgrep: tolatino-sql-con-texto-interpolado — q.sql sale solo de datosDeCuenta/datosDeNegocio
    if (n) out.push({ k: q.nombre, n, filas: (await c.query<Fila>(`select * from (${q.sql}) t limit ${filas}`, q.args)).rows.map((x) => limpiar(x, q.fuera, q.tabla)) });
  }
  return out;
}

/* Cuántas filas trae cada archivo y en cuántas partes (lo que dice el LEEME y lo que se guarda en data_exports.sections). */
export type Seccion = { filas: number; partes: number; fuera: number };

const LEEME = (negocio: boolean, archivos: Map<string, Seccion>) => [
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
  `ES · Cada parte trae hasta ${PARTE.toLocaleString("en-US")} filas: si un archivo tiene más, va en varias (operaciones-1.csv, operaciones-2.csv…), en orden.`,
  `EN · Each part holds up to ${PARTE.toLocaleString("en-US")} rows: a file with more comes in several (operaciones-1.csv, operaciones-2.csv…), in order.`,
  "",
  ...[...archivos].map(([k, v]) => `${k}: ${v.filas}${v.partes > 1 ? ` (${v.partes} partes / parts)` : ""}${v.fuera ? ` · ${v.fuera} más no caben: pídelas a Soporte / ${v.fuera} more did not fit: ask Support` : ""}`),
  "",
].join("\r\n");

/* El ZIP: JSON + CSV de cada parte de cada archivo, y el LEEME (con lo que de verdad salió). Todo por cursor, dentro de una transacción de solo lectura
   (una foto fija de la base: las partes no se pisan aunque lleguen filas nuevas mientras se arma).
   `salida` (22 nov): los trozos comprimidos van ahí en orden, al llegar (el barrido los escribe a disco) y `zip` vuelve vacío; sin ella, el ZIP
   entero en `zip` (lo usa «Exportar sus datos» del equipo, que lo entrega en la misma respuesta). */
export async function armarZip(consultas: Consulta[], negocio: boolean, c?: PoolClient, salida?: (b: Buffer) => void): Promise<{ zip: Buffer; secciones: Map<string, Seccion> }> {
  const hacer = async (c: PoolClient) => {
    const z = zipPorPartes(salida), secciones = new Map<string, Seccion>();
    let i = 0;
    for (const q of consultas) {
      const s: Seccion = { filas: 0, partes: 0, fuera: 0 }, crudas: Fila[][] = [];
      // La primera parte se guarda hasta saber si hay segunda (una sola parte se llama sin número: lo que bajaron siempre).
      for await (const t of porPartes(c, q, i++)) {
        if (s.partes >= TOPE_PARTES) { s.fuera += t.length; continue; }
        s.partes++; s.filas += t.length;
        if (s.partes === 1) { crudas.push(t); continue; }
        if (s.partes === 2) { const p1 = crudas.pop()!; z.agregar(`${q.nombre}-1.json`, Buffer.from(JSON.stringify(p1, null, 2), "utf8")); z.agregar(`${q.nombre}-1.csv`, Buffer.from(aCsv(p1), "utf8")); }
        z.agregar(`${q.nombre}-${s.partes}.json`, Buffer.from(JSON.stringify(t, null, 2), "utf8"));
        z.agregar(`${q.nombre}-${s.partes}.csv`, Buffer.from(aCsv(t), "utf8"));
      }
      const p1 = crudas.pop() ?? [];
      if (s.partes <= 1) { z.agregar(`${q.nombre}.json`, Buffer.from(JSON.stringify(p1, null, 2), "utf8")); z.agregar(`${q.nombre}.csv`, Buffer.from(aCsv(p1), "utf8")); }
      secciones.set(q.nombre, s);
    }
    z.agregar("LEEME.txt", Buffer.from(LEEME(negocio, secciones), "utf8"));
    return { zip: z.cerrar(), secciones };
  };
  if (c) return hacer(c);
  return tx(async (t) => { await t.query("set transaction isolation level repeatable read, read only"); return hacer(t); });
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
/* 9t · Se confirma con el código por SMS (data_export) o con la llave de acceso: una prueba de lib/llaves/llaves.ts confirmarConLlave de ESTE
   propósito, que se gasta aquí dentro (usarConfirmacionEn; la del borrado no sirve). Guardián confirmarConLlave. */
export async function pedirArchivo(u: { id: string; phone: string }, codigo: string | PruebaLlave, negocio: string | null): Promise<ResExp> {
  const { consumirCodigo } = await import("../cuenta");
  const L = typeof codigo === "string" ? null : await import("../llaves/llaves");
  return tx(async (c): Promise<ResExp> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`export:${u.id}:${negocio ?? ""}`]);
    const v = typeof codigo === "string" ? await consumirCodigo(c, u.phone, "data_export", codigo) : await L!.usarConfirmacionEn(c, u, codigo, "data_export");
    if (v === "codigo_incorrecto") return no("Ese código no es. Revísalo.", "That code is not right. Check it.");
    if (v === "codigo_vencido") return no("El código venció. Pide uno nuevo.", "The code expired. Ask for a new one.");
    if (v === "demasiados") return no("Demasiados intentos. Pide un código nuevo en un rato.", "Too many tries. Ask for a new code in a while.");
    if (v !== "ok") { const m = L!.mensajeConfirmar(v); return no(m.es, m.en); }
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

/* 22 nov · El ZIP se arma en un archivo temporal (<tmp>/tl-exportes/<id del pedido>.zip, solo del proceso) y sube desde el disco. Se borra en el
   finally de quien lo arma; si el proceso se cayó a mitad, el pedido vuelve a la fila (vencerExportaciones) con el MISMO id y el mismo nombre de
   archivo: se escribe encima desde cero y se borra al terminar (nada se acumula en el disco). */
const DIR_EXPORTES = () => join(tmpdir(), "tl-exportes");
/* Armar el ZIP a un archivo: cada trozo comprimido se escribe al llegar (con su sha256 y su tamaño); en memoria nunca está el ZIP entero. */
async function armarADisco(consultas: Consulta[], negocio: boolean, ruta: string): Promise<{ secciones: Map<string, Seccion>; sha256: string; bytes: number }> {
  const fd = openSync(ruta, "w", 0o600), hash = createHash("sha256");
  let bytes = 0;
  try {
    const { secciones } = await armarZip(consultas, negocio, undefined, (b) => {
      for (let o = 0; o < b.length;) o += writeSync(fd, b, o, b.length - o);
      hash.update(b); bytes += b.length;
    });
    return { secciones, sha256: hash.digest("hex"), bytes };
  } finally { closeSync(fd); }
}

/* ── El barrido: armar los pedidos y sacar del almacén lo bajado o vencido ── */
export async function armarPendientes(max = 3): Promise<number> {
  const { guardarArchivo, mediosListos } = await import("../medios");
  if (!mediosListos()) return 0; // sin almacén privado no se arma nada (el pedido espera)
  let n = 0;
  for (let i = 0; i < max; i++) {
    const e = (await db().query<{ id: string; user_id: string; business_id: string | null }>(
      `update data_exports set status = 'armando' where id = (select id from data_exports where status = 'pendiente' order by requested_at limit 1 for update skip locked)
       returning id::text, user_id::text, business_id`)).rows[0];
    if (!e) break;
    let ruta: string | null = null;
    try {
      const t0 = Date.now();
      await mkdir(DIR_EXPORTES(), { recursive: true, mode: 0o700 });
      ruta = join(DIR_EXPORTES(), `${e.id}.zip`);
      const { secciones, sha256, bytes } = await armarADisco(e.business_id ? datosDeNegocio(e.business_id) : await datosDeCuenta(e.user_id), !!e.business_id, ruta);
      const clave = `privado/exportes/${e.id}.zip`;
      await guardarArchivo(clave, ruta, "application/zip", sha256);
      await db().query(
        `update data_exports set status = 'listo', media_key = $2, sha256 = $3, bytes = $4::int, sections = $5::jsonb, ready_at = now(), expires_at = now() + make_interval(hours => cfg_int('export_vence_h'))
          where id = $1::uuid and status = 'armando'`,
        [e.id, clave, sha256, bytes, JSON.stringify({ ...Object.fromEntries([...secciones].map(([k, v]) => [k, v.filas])),
          ...([...secciones].some(([, v]) => v.partes > 1 || v.fuera) ? { _partes: Object.fromEntries([...secciones].filter(([, v]) => v.partes > 1 || v.fuera).map(([k, v]) => [k, v])) } : {}),
          _ms: Date.now() - t0 })]);
      const { avisar } = await import("../avisos");
      if (e.business_id) {
        const nb = (await db().query<{ name: string }>(`select name from businesses where id = $1`, [e.business_id])).rows[0]?.name ?? "";
        await avisar(e.user_id, "datos_export_negocio", { negocio: nb }, { href: `/panel/${e.business_id}/exportar`, ref: ["data_export", e.id] });
      } else await avisar(e.user_id, "datos_export_listo", {}, { href: "/cuenta/ajustes/privacidad/datos", ref: ["data_export", e.id] });
      n++;
    } catch (err) {
      await db().query(`update data_exports set status = 'fallo', error = $2 where id = $1::uuid and status = 'armando'`, [e.id, String((err as Error)?.message ?? err).slice(0, 300)]);
    } finally {
      if (ruta) await rm(ruta, { force: true }).catch(() => undefined);
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

/* ── Bajar el archivo (POST /api/datos/archivo/<id>): solo quien lo pidió, una vez, antes de que venza ──
   22 nov · En flujo: después del permiso se ABRE el objeto en el almacén (abrirObjeto: por partes, nunca entero en memoria) y solo si está se gasta
   el uso; quien pierde la carrera suelta el cuerpo sin leerlo (sin esperar). El cuerpo pasa tal cual a la respuesta (guardián exportacionEnFlujo). */
export type ResBajar = { ok: true; cuerpo: ReadableStream<Uint8Array>; largo: number | null; nombre: string } | { ok: false; status: 404 | 410 };
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
  const { abrirObjeto } = await import("../medios");
  const a = await abrirObjeto(e.media_key);
  // El archivo ya no está en el almacén: no se gasta el uso (no hay nada que bajar).
  if (!a || a.estado !== 200) return { ok: false, status: 410 };
  // Un uso: gana el primero (dos pedidos a la vez: el segundo ve 410).
  const ipHash = ip ? createHash("sha256").update(`ip:${ip}`).digest("hex") : null;
  let r: { rowCount: number | null };
  try { r = await db().query(`update data_exports set status = 'bajado', downloaded_at = now(), ip_hash = $3 where id = $1::uuid and user_id = $2::uuid and status = 'listo' and expires_at > now()`, [id, userId, ipHash]); }
  catch (err) { void a.cuerpo.cancel().catch(() => undefined); throw err; }
  if (!r.rowCount) { void a.cuerpo.cancel().catch(() => undefined); return { ok: false, status: 410 }; }
  return { ok: true, cuerpo: a.cuerpo, largo: a.largo, nombre: e.business_id ? `tolatino-negocio-${e.business_id}.zip` : "tolatino-mis-datos.zip" };
}

/* ── Usuarios 360° › Privacidad: sus archivos (sin contenido) ── */
export async function archivosDe(userId: string) {
  return (await db().query<{ id: string; negocio: string | null; estado: string; pedido: string; bajado: string | null; bytes: number | null; equipo: string | null }>(
    `select e.id::text, e.business_id as negocio, case when e.status = 'listo' and e.expires_at <= now() then 'vencido' else e.status end as estado,
            to_char(e.requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pedido, to_char(e.downloaded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as bajado,
            e.bytes, nullif(trim(coalesce(s.first_name, '') || ' ' || left(coalesce(s.last_name, ''), 1)), '') as equipo
       from data_exports e left join users s on s.id = e.requested_by where e.user_id = $1::uuid order by e.requested_at desc limit 10`, [userId])).rows;
}
