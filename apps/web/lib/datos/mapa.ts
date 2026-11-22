import "server-only";
import type { PoolClient } from "pg";
import { db } from "../db";
// 9u-2 · Solo la lista «notas» del mapa (la exportación la lee aquí, sin pasar por la base: no cambia la purga ni la fusión).
import MAPA from "../../../../packages/db/mapa-de-datos.json";

/* 9d · El mapa de datos (data_map; fase9-apertura.md §3.7). Lo escribe SOLO la semilla packages/db/seeds/mapa_datos.sql, que sale de
   packages/db/mapa-de-datos.json (scripts/datos/mapa.mjs valida cada nombre y cada valor). Aquí solo se lee: la exportación (qué archivo),
   la purga a los 30 días (qué se borra, se vacía o se seudonimiza) y la fusión de cuentas (qué se mueve). Los nombres de tabla y columna se
   vuelven a revisar antes de entrar a una consulta (ID), aunque vengan del mapa. */
export type Accion = "borrar" | "vaciar" | "seudonimizar" | "guardar";
export type FilaMapa = {
  tabla: string; columna: string; rol: "persona" | "equipo" | "telefono"; accion: Accion; set_sql: string | null; pendiente_sql: string | null; donde_sql: string | null;
  porque: { es: string; en: string } | null; exporta: string | null; fusion: "mover" | "no"; fn: "usuario" | "compa" | "negocios" | "fotos" | "traducciones" | null;
  derivados: boolean; orden: number;
};
export const ID = /^[a-z_][a-z0-9_]*$/;
export const ident = (x: string) => { if (!ID.test(x)) throw new Error(`mapa: nombre inválido «${x}»`); return `"${x}"`; };

let cache: { at: number; filas: FilaMapa[] } | null = null;
/* El mapa entero, en orden (la purga va en ese orden). Caché de 60 s: cambia solo con un despliegue. */
export async function mapa(c?: PoolClient): Promise<FilaMapa[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.filas;
  const q = `select tabla, columna, rol, accion, set_sql, pendiente_sql, donde_sql, porque, exporta, fusion, fn, derivados, orden from data_map order by orden`;
  const filas = (c ? await c.query<FilaMapa>(q) : await db().query<FilaMapa>(q)).rows;
  for (const f of filas) {
    ident(f.tabla); ident(f.columna);
    // Lo que se escribe sale del mapa validado (scripts/datos/mapa.mjs); aun así, nunca una segunda sentencia ni un comentario.
    for (const s of [f.set_sql, f.pendiente_sql, f.donde_sql]) if (s && /;|--|\/\*/.test(s.replace(/'(?:[^']|'')*'/g, "''"))) throw new Error(`mapa: ${f.tabla}.${f.columna} trae algo que no es un valor`);
  }
  cache = { at: Date.now(), filas };
  return filas;
}

/* Las columnas de cada tabla que apuntan a una persona (users): al exportar, las de OTRA persona salen del archivo. */
let refs: Map<string, Set<string>> | null = null;
export async function columnasDePersona(c?: PoolClient): Promise<Map<string, Set<string>>> {
  if (refs) return refs;
  const q = `select k.conrelid::regclass::text as t, a.attname as c from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any (k.conkey)
              where k.contype = 'f' and k.confrelid = 'users'::regclass`;
  const r = (c ? await c.query<{ t: string; c: string }>(q) : await db().query<{ t: string; c: string }>(q)).rows;
  refs = new Map();
  for (const x of r) (refs.get(x.t) ?? refs.set(x.t, new Set()).get(x.t)!).add(x.c);
  // Lo que apunta a una persona sin llave foránea (el mapa también lo marca).
  for (const f of await mapa(c)) if (f.rol !== "telefono") (refs.get(f.tabla) ?? refs.set(f.tabla, new Set()).get(f.tabla)!).add(f.columna);
  return refs;
}

/* Lo que nunca sale en un archivo aunque sea de la persona: huellas, cifrados, tokens, llaves, el índice de búsqueda y la ubicación exacta. */
export const NUNCA_SE_EXPORTA = /(^|_)(hash|enc|token|secret|public_key|credential_id|challenge|sign_count|aaguid|tsv|search_doc|geom)$|^(geo|viewing_center|stripe_\w+|is_test)$/;

/* 9u-2 · Las notas y los motivos (columnas que se llaman reason, *_reason, note, *_note, notes, motivo, *_motivo, nota, *_nota, notas) de las tablas
   que salen en un archivo: UNA sola lista, «notas» en packages/db/mapa-de-datos.json (junto a las reglas de cada tabla), que la exportación lee
   aquí (limpiar). Decisión (REVISION 9u-2): lo que el equipo escribe como interno NO
   sale en «Descargar mis datos»; lo que la persona ya ve en su pantalla o le llega en un aviso SÍ. Cada una dice:
     sale: true   → sale (la persona la ve: «ve» dice dónde)
     sale: false  → no sale (interna: la escribe el equipo, el sistema o el negocio para sí, y la persona no la ve)
     sale: "…"    → sale SOLO en las filas donde la pantalla la pinta (la condición, sobre columnas de la misma fila); en las demás va vacía.
   Una columna con nombre de nota que NO está aquí no sale (falla cerrada) y la prueba nota9u2 (contra la base) se pone en rojo hasta que alguien la
   clasifique. Guardián notaInternaFueraDelArchivo; al revés: alreves9u2. */
export const ES_NOTA = /(^|_)(reason|note|notes|motivo|nota|notas)$/;
export const NOTAS: Record<string, { sale: boolean | string; ve: string }> = Object.fromEntries(Object.entries(MAPA.notas).filter(([k]) => !k.startsWith("$"))) as Record<string, { sale: boolean | string; ve: string }>;
/* 22 nov · Las columnas que NO salen en el archivo aunque la fila sea de la persona (lo que dice de OTRA persona o la ruta interna de una copia):
   «internas» en packages/db/mapa-de-datos.json, tabla.columna → por qué. La exportación las quita de cada archivo (limpiar). Guardián
   notaInternaFueraDelArchivo; la prueba contra la base, nota9u2. */
export const INTERNAS: Record<string, { ve: string }> = Object.fromEntries(Object.entries(MAPA.internas).filter(([k]) => !k.startsWith("$"))) as Record<string, { ve: string }>;
export const columnaInterna = (tabla: string, col: string): boolean => `${tabla}.${col}` in INTERNAS;
/* Una condición de NOTAS: solo «columna = 'valor'» o «columna in ('a', 'b')» (va dentro de la consulta de la exportación). */
export const CONDICION_NOTA = /^[a-z_]+ (= '[a-z_]+'|in \('[a-z_]+'(, '[a-z_]+')*\))$/;
/* ¿Sale esta columna de esta tabla? true / false / la condición por fila. Lo que no tiene nombre de nota, sale (lo demás lo deciden el mapa y
   NUNCA_SE_EXPORTA); una nota sin clasificar, no. */
export function notaSale(tabla: string, col: string): boolean | string {
  if (!ES_NOTA.test(col)) return true;
  const n = NOTAS[`${tabla}.${col}`];
  if (!n) return false;
  if (typeof n.sale === "string" && !CONDICION_NOTA.test(n.sale)) return false;
  return n.sale;
}
/* Las condiciones por fila de una tabla: «, (cond) as "__sale__col"» para la consulta (limpiar las lee y las quita). */
export function banderasDeNotas(tabla: string): string {
  return Object.entries(NOTAS).filter(([k, v]) => k.startsWith(`${tabla}.`) && typeof v.sale === "string" && CONDICION_NOTA.test(v.sale))
    .map(([k, v]) => `, (${v.sale as string}) is true as ${ident(`__sale__${k.slice(tabla.length + 1)}`)}`).join("");
}

/* Los porqués de lo que se guarda (Privacidad, Usuarios 360°). */
export async function resumenMapa() {
  const F = await mapa();
  const por = (a: Accion) => [...new Set(F.filter((f) => f.rol !== "equipo" && f.accion === a).map((f) => f.tabla))];
  return { borrar: por("borrar"), vaciar: por("vaciar"), seudonimizar: por("seudonimizar"), guardar: por("guardar"), exporta: [...new Set(F.filter((f) => f.exporta).map((f) => f.exporta!))] };
}

/* 9e · Lo que /privacidad dice del mapa (el mismo que usan la exportación y la purga): cuántos tipos de datos se borran, se vacían o se guardan
   sin tu nombre al borrar la cuenta, los porqués de lo que se guarda (sin repetir) y los archivos que trae «Descargar mis datos». */
export async function privacidadDelMapa(): Promise<{ n: Record<Accion, number>; porques: { es: string; en: string }[]; archivos: string[] }> {
  const F = (await mapa()).filter((f) => f.rol !== "equipo");
  const n = { borrar: 0, vaciar: 0, seudonimizar: 0, guardar: 0 } as Record<Accion, number>;
  for (const a of Object.keys(n) as Accion[]) n[a] = new Set(F.filter((f) => f.accion === a).map((f) => f.tabla)).size;
  const vistos = new Set<string>(), porques: { es: string; en: string }[] = [];
  for (const f of F) if ((f.accion === "seudonimizar" || f.accion === "guardar") && f.porque && !vistos.has(f.porque.es)) { vistos.add(f.porque.es); porques.push(f.porque); }
  return { n, porques, archivos: [...new Set(F.filter((f) => f.exporta).map((f) => f.exporta!))].sort() };
}
