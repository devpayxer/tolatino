// 9t · Prueba de la regla tolatino-sql-con-texto-interpolado (semgrep --test semgrep/). «ruleid:» = la línea de abajo TIENE que salir;
// «ok:» = la de abajo NO puede salir. No es código de la app: nadie lo importa (ni lo compila tsc). Guardián tuberiaSeguridad.
/* eslint-disable */
// @ts-nocheck
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { centroSQL, type Punto } from "@/lib/punto";
import { ident } from "@/lib/datos/mapa";

const ORDEN: Record<string, string> = { nuevo: "b.created_at desc", nombre: "lower(b.name)" };
const COLS = "b.id, b.name";

// ── Lo que TIENE que cazar ──

// Un parámetro directo en el texto (la forma de siempre).
export async function buscarMal(q: string) {
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select ${COLS} from businesses b where b.name ilike '%${q}%'`);
}

// Un nombre que la regla vieja no miraba («orden», «col», «where»…): el flujo de datos sí.
export async function listaMal(orden: string, col: string) {
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select ${col} from businesses b order by ${orden}`);
}

// Desestructurado y con flecha.
export const porCiudadMal = async ({ ciudad }: { ciudad: string }) =>
  // ruleid: tolatino-sql-con-texto-interpolado
  db().query(`select 1 from businesses where city_id = '${ciudad}'`);

// Armado por partes: w.push(…) y luego w.join(" and ").
export async function filtrosMal(f: { cat: string; zona: string }) {
  const w: string[] = ["b.status = 'active'"];
  if (f.cat) w.push(`b.category_id = '${f.cat}'`);
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from businesses b where ${w.join(" and ")}`);
}

// El texto en una variable y la variable a la consulta.
export async function porVariableMal(nombre: string) {
  const sql = `select 1 from users where first_name = '${nombre}'`;
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(sql, []);
}

// «await x.query<Tipo>(…)»: la forma que la regla vieja no veía como consulta.
export async function conTipoMal(c: { query: Function }, id: string) {
  // ruleid: tolatino-sql-con-texto-interpolado
  return (await c.query<{ n: number; m: string }>(`select count(*)::int as n from items where id = ${id}`)).rows;
}

// Con el tipo y sin await, dentro de Promise.all.
export async function enParaleloMal(negocio: string) {
  return Promise.all([
    // ruleid: tolatino-sql-con-texto-interpolado
    db().query<{ id: string }>(`select id from items where business_id = '${negocio}'`),
  ]);
}

// Lo que llega en un formulario de una acción del servidor.
export async function accionMal(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "");
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`update businesses set name = '${nombre}' where id = $1`, ["x"]);
}

// El cuerpo y la URL de una ruta.
export async function POST(req: Request) {
  const b = await req.json();
  // ruleid: tolatino-sql-con-texto-interpolado
  await db().query(`select 1 from users where phone = '${b.tel}'`);
  const sp = new URL(req.url).searchParams;
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from users where nick = '${sp.get("nick")}'`);
}

// Lo que se lee del pedido sin ser parámetro (cookies()).
export async function galletaMal() {
  const c = (await cookies()).get("ciudad")?.value;
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from cities where id = '${c}'`);
}

// Una lista de afuera con .map: cada elemento entra al texto.
export async function idsMal(ids: string[]) {
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from items where id in (${ids.map((i) => `'${i}'`).join(",")})`);
}

// El .length de algo que llegó de afuera no es un número seguro: { length: "1; drop table users" }.
export async function largoMal(ids: string[]) {
  // ruleid: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from items limit ${ids.length}`);
}

// ── Lo que NO puede cazar ──

// Los valores como parámetros ($1, $2…) y el número del parámetro del arreglo armado aquí.
export async function buscarBien(q: string, cat: string | null) {
  const v: unknown[] = [`%${q}%`], w = ["b.name ilike $1"];
  if (cat) { v.push(cat); w.push(`b.category_id = $${v.length}`); }
  // ok: tolatino-sql-con-texto-interpolado
  return db().query(`select ${COLS} from businesses b where ${w.join(" and ")}`, v);
}

// Elegido de un mapa fijo del código, o con una comparación.
export async function ordenBien(orden: string, desc: boolean) {
  // ok: tolatino-sql-con-texto-interpolado
  await db().query(`select 1 from businesses b order by ${ORDEN[orden] ?? ORDEN.nuevo}`);
  // ok: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from businesses b order by b.id ${desc === true ? "desc" : "asc"}`);
}

// Números ya convertidos.
export async function paginaBien(pag: unknown, n: unknown) {
  // ok: tolatino-sql-con-texto-interpolado
  await db().query(`select 1 from items limit ${Math.min(50, Number(n))} offset ${(Number(pag) - 1) * 20}`);
  // ok: tolatino-sql-con-texto-interpolado
  return db().query(`select 1 from items limit ${Math.round(Number(n))}`);
}

// El centro validado de lib/punto.ts y un nombre de tabla revisado por ident().
export async function puntoBien(p: Punto, tabla: string) {
  // ok: tolatino-sql-con-texto-interpolado
  await db().query(`select st_distance(b.geo, ${centroSQL(p)}) from businesses b`);
  // ok: tolatino-sql-con-texto-interpolado
  return db().query(`select count(*) from ${ident(tabla)}`);
}
