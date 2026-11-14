import "server-only";
import type { PoolClient } from "pg";
import { db } from "../db";

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

/* Los porqués de lo que se guarda (Privacidad, Usuarios 360°). */
export async function resumenMapa() {
  const F = await mapa();
  const por = (a: Accion) => [...new Set(F.filter((f) => f.rol !== "equipo" && f.accion === a).map((f) => f.tabla))];
  return { borrar: por("borrar"), vaciar: por("vaciar"), seudonimizar: por("seudonimizar"), guardar: por("guardar"), exporta: [...new Set(F.filter((f) => f.exporta).map((f) => f.exporta!))] };
}
