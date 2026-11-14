import "server-only";
import { Pool } from "pg";
import { db } from "./db";

/* 9g · La base de análisis (HERRAMIENTAS #33, PLAN §3.2: «réplica de lectura para análisis»). Todo lo que lee Analítica (lib/admin-analitica.ts, los
   reportes programados y el reporte diario) pasa por aquí (guardián analisisPorReplica): en producción, DATABASE_URL_ANALISIS apunta a la réplica de
   lectura y una consulta pesada de Analítica nunca frena un pedido; en el sandbox no existe y se usa la misma base. Solo lectura: cada conexión nace
   con default_transaction_read_only (aunque la variable apunte por error a la principal, Analítica no puede escribir). Lo que ESCRIBE derivados
   (metricas_*, *_cache) es el barrido, por la conexión principal (lib/analitica-derivados.ts). */
let pool: Pool | null = null;
export function dbAnalisis(): Pool {
  const url = process.env.DATABASE_URL_ANALISIS;
  if (!url) return db();
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 6, connectionTimeoutMillis: 3000, statement_timeout: 20_000 });
    pool.on("connect", (c) => { void c.query("set default_transaction_read_only = on"); });
  }
  return pool;
}

/* ¿Hay una base de análisis aparte? (Sistema y la ayuda lo dicen; nunca la URL). */
export const analisisAparte = () => !!process.env.DATABASE_URL_ANALISIS;
