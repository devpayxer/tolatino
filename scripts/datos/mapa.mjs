#!/usr/bin/env node
/* 9d · El mapa de datos (fase9-apertura.md §3.7): de packages/db/mapa-de-datos.json salen las filas de data_map (la semilla repetible
   packages/db/seeds/mapa_datos.sql). Lo que escribe la purga al vaciar o seudonimizar sale de aquí, VALIDADO: solo nombres de columna y valores de
   una lista cerrada (null, true, false, now(), un texto entre comillas, coalesce/least de la misma columna y los dos «case» conocidos). Nada de lo que
   llega a la base se arma con texto de una persona.
   Uso: node scripts/datos/mapa.mjs           escribe la semilla
        node scripts/datos/mapa.mjs --revisar  solo revisa (sale con 1 si hay problemas)
   El guardián mapaDeDatos importa filas(), semilla() y problemas() de aquí: lo que revisa es exactamente lo que se aplica. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MAPA = "packages/db/mapa-de-datos.json";
export const SEMILLA = "packages/db/seeds/mapa_datos.sql";
export const ACCIONES = ["borrar", "vaciar", "seudonimizar", "guardar"];
export const FNS = ["usuario", "compa", "negocios", "fotos", "traducciones"];
const ID = /^[a-z_][a-z0-9_]*$/;
const TEXTO = "'(?:[^';\\\\]|'')*'";
/* Los únicos valores que el mapa puede escribir. */
const VALORES = [
  /^null$/, /^true$/, /^false$/, /^now\(\)$/,
  new RegExp(`^${TEXTO}(::jsonb)?$`),
  new RegExp(`^coalesce\\(([a-z_]+), (now\\(\\)|${TEXTO})\\)$`),
  /^least\(([a-z_]+), now\(\)\)$/,
  /^case when status in \('[a-z_]+'(, '[a-z_]+')*\) then '[a-z_]+' else status end$/,
  /^case when status = '[a-z_]+' then '[a-z_]+' else status end$/,
  /^case when private then 'privado\/borrada' else 'borrada' end$/,
];
const DONDE = /^[a-z_]+ in \('[a-z_]+'(, '[a-z_]+')*\)$/;
const literal = (v) => /^(null|true|false)$/.test(v) || new RegExp(`^${TEXTO}(::jsonb)?$`).test(v);

export const leer = (raiz = RAIZ) => JSON.parse(readFileSync(join(raiz, MAPA), "utf8"));

/* Las filas de data_map, en el orden del archivo (la purga va en ese orden). */
export function filas(m = leer()) {
  const out = [];
  let orden = 0;
  for (const [tabla, t] of Object.entries(m.tablas)) {
    for (const r of t.reglas ?? []) {
      orden += 10;
      const set = r.set ?? null;
      const pend = set ? Object.entries(set).map(([c, v]) => {
        if (literal(v)) return v === "null" ? `"${c}" is not null` : `"${c}" is distinct from ${v}`;
        const co = /^coalesce\(([a-z_]+), /.exec(v); if (co && co[1] === c) return `"${c}" is null`;
        const le = /^least\(([a-z_]+), now\(\)\)$/.exec(v); if (le && le[1] === c) return `"${c}" > now()`;
        return null;
      }).filter(Boolean) : [];
      out.push({
        tabla, columna: r.col, rol: r.telefono ? "telefono" : "persona", accion: r.accion,
        set_sql: set ? Object.entries(set).map(([c, v]) => `"${c}" = ${v}`).join(", ") : null,
        pendiente_sql: pend.length ? pend.join(" or ") : null,
        porque: r.porque ? m.porques[r.porque] ?? null : null, porqueK: r.porque ?? null, exporta: r.exporta ?? null, fusion: r.fusion ?? "no",
        fn: t.fn ?? null, derivados: !!r.derivados, orden, set, donde_sql: r.donde ?? null,
      });
    }
    for (const c of t.equipo ?? []) {
      orden += 10;
      out.push({ tabla, columna: c, rol: "equipo", accion: "guardar", set_sql: null, pendiente_sql: null, donde_sql: null, porque: m.porques.equipo, porqueK: "equipo", exporta: null, fusion: "no", fn: null, derivados: false, orden, set: null });
    }
  }
  return out;
}

/* Lo que está mal en el mapa (sin mirar la base): nombres, acciones, valores, porqués, una columna dos veces. */
export function problemas(m = leer()) {
  const P = [], vistos = new Set();
  if (!m.porques?.equipo) P.push("falta el porqué «equipo»");
  for (const [k, v] of Object.entries(m.porques ?? {})) if (!v?.es || !v?.en) P.push(`el porqué «${k}» necesita es y en`);
  for (const [tabla, t] of Object.entries(m.tablas ?? {})) {
    if (!ID.test(tabla)) P.push(`${tabla}: nombre de tabla inválido`);
    if (t.fn && !FNS.includes(t.fn)) P.push(`${tabla}: fn «${t.fn}» no existe (${FNS.join(", ")})`);
    if (!(t.reglas?.length) && !(t.equipo?.length)) P.push(`${tabla}: sin reglas ni columnas del equipo`);
    for (const r of [...(t.reglas ?? []).map((x) => ({ ...x })), ...(t.equipo ?? []).map((c) => ({ col: c, accion: "guardar", porque: "equipo" }))]) {
      const k = `${tabla}.${r.col}`;
      if (vistos.has(k)) P.push(`${k}: está dos veces`);
      vistos.add(k);
      if (!ID.test(r.col ?? "")) P.push(`${k}: nombre de columna inválido`);
      if (!ACCIONES.includes(r.accion)) P.push(`${k}: acción «${r.accion}» (${ACCIONES.join(", ")})`);
      if (r.porque && !m.porques?.[r.porque]) P.push(`${k}: el porqué «${r.porque}» no existe`);
      if (r.accion === "guardar" && !r.porque) P.push(`${k}: guardar necesita su porqué`);
      if (r.accion === "seudonimizar" && !r.porque) P.push(`${k}: seudonimizar necesita su porqué (ley, dinero, auditoría…)`);
      if ((r.accion === "vaciar" || r.accion === "seudonimizar") && (!r.set || !Object.keys(r.set).length) && !(r.accion === "seudonimizar")) P.push(`${k}: vaciar necesita lo que se vacía (set)`);
      if (r.set && (r.accion === "borrar" || r.accion === "guardar")) P.push(`${k}: ${r.accion} no lleva set`);
      for (const [c, v] of Object.entries(r.set ?? {})) {
        if (!ID.test(c)) P.push(`${k}: set con columna inválida «${c}»`);
        if (typeof v !== "string" || !VALORES.some((re) => re.test(v))) P.push(`${k}: set ${c} = «${v}» no es un valor permitido`);
        const co = /^(?:coalesce|least)\(([a-z_]+),/.exec(v ?? ""); if (co && co[1] !== c) P.push(`${k}: ${c} = ${v} (coalesce/least solo de la misma columna)`);
      }
      if (r.donde && !DONDE.test(r.donde)) P.push(`${k}: donde «${r.donde}» (solo «columna in ('a', 'b')»)`);
      if (r.exporta && !/^[a-z0-9_]{2,40}$/.test(r.exporta)) P.push(`${k}: exporta «${r.exporta}» (minúsculas y _)`);
      if (r.fusion && !["mover", "no"].includes(r.fusion)) P.push(`${k}: fusion «${r.fusion}» (mover | no)`);
      if (r.fusion === "mover" && r.accion === "guardar") P.push(`${k}: lo que se guarda por su porqué no se mueve al fusionar`);
    }
  }
  for (const [t, v] of Object.entries(m.sinPersona ?? {})) {
    if (!ID.test(t)) P.push(`sinPersona: nombre inválido «${t}»`);
    if (!v?.es || !v?.en) P.push(`sinPersona ${t}: necesita es y en (qué pasa con sus datos)`);
    if (m.tablas?.[t]) P.push(`${t}: está en tablas y en sinPersona`);
  }
  for (const f of filas(m)) if (f.set && (f.accion === "vaciar" || f.accion === "seudonimizar") && !f.pendiente_sql) P.push(`${f.tabla}.${f.columna}: lo que escribe no se puede comprobar (usa al menos un valor fijo o coalesce/least de la misma columna)`);
  const ex = filas(m).filter((f) => f.exporta).map((f) => f.exporta);
  for (const e of new Set(ex)) if (ex.filter((x) => x === e).length > 1) P.push(`exporta «${e}» está en dos tablas`);
  return P;
}

const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
/* La semilla repetible (packages/db/seeds/mapa_datos.sql). */
export function semilla(m = leer()) {
  const F = filas(m);
  const vals = F.map((f) => `  (${[q(f.tabla), q(f.columna), q(f.rol), q(f.accion), q(f.set_sql), q(f.pendiente_sql), q(f.donde_sql), f.porque ? `${q(JSON.stringify(f.porque))}::jsonb` : "null", q(f.exporta), q(f.fusion), q(f.fn), f.derivados, f.orden].join(", ")})`);
  return `-- 9d · El mapa de datos (data_map). GENERADO por scripts/datos/mapa.mjs desde packages/db/mapa-de-datos.json: no se edita a mano
-- (el guardián mapaDeDatos compara este archivo con lo que sale del mapa). Configuración real, no datos de ejemplo: corre en todos los entornos.
begin;
insert into data_map (tabla, columna, rol, accion, set_sql, pendiente_sql, donde_sql, porque, exporta, fusion, fn, derivados, orden) values
${vals.join(",\n")}
on conflict (tabla, columna) do update set rol = excluded.rol, accion = excluded.accion, set_sql = excluded.set_sql, pendiente_sql = excluded.pendiente_sql, donde_sql = excluded.donde_sql,
  porque = excluded.porque, exporta = excluded.exporta, fusion = excluded.fusion, fn = excluded.fn, derivados = excluded.derivados, orden = excluded.orden;
-- Lo que salió del mapa sale de la tabla (es configuración: el mapa es la fuente).
delete from data_map d where not exists (select 1 from (values
${F.map((f) => `  (${q(f.tabla)}, ${q(f.columna)})`).join(",\n")}
) v (tabla, columna) where v.tabla = d.tabla and v.columna = d.columna);
commit;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const P = problemas();
  if (P.length) { console.error(`✗ el mapa tiene ${P.length} problema(s):\n` + P.map((x) => "  " + x).join("\n")); process.exit(1); }
  if (process.argv.includes("--revisar")) { console.log(`✓ mapa sin problemas (${filas().length} filas)`); process.exit(0); }
  writeFileSync(join(RAIZ, SEMILLA), semilla());
  console.log(`✓ ${SEMILLA}: ${filas().length} filas`);
}
