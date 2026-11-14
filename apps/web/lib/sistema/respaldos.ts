import "server-only";
import { db } from "../db";
import { ENTORNO } from "../entorno";
import { ATRASO_H, SIN_RESTAURAR_DIAS } from "./respaldos-comun";

/* 9j · Super Admin › Sistema › Respaldos (prototipo secSys «backup» + hueco #3 del plan: «Restauración de prueba» arriba, porque lo que importa es que
   restaura; fase9-apertura.md §3.4). Lee backup_runs y restore_drills (solo inserción): el último de cada tipo (base completa, WAL, fotos, sobre de
   llaves), la lista y las restauraciones de prueba con su RTO, las filas contadas y la consulta de verificación. Los escriben los respaldos reales
   de producción (pgBackRest y la restauración semanal en una máquina desechable, 9o); en el sandbox, la semilla de pruebas (is_test). Alertas:
   respaldo de la base atrasado (más de 26 h sin uno bueno), restauración que falló y restauración que no corrió en 8 días. */
export type Tipo = "base" | "wal" | "fotos" | "sobre";
export const TIPOS: Tipo[] = ["base", "wal", "fotos", "sobre"];
export type Respaldo = { id: string; kind: Tipo; at: string; fin: string | null; bytes: number | null; sha: string | null; destino: string | null; result: "ok" | "fallo"; detail: string | null; prueba: boolean };
export type Simulacro = { id: string; at: string; fin: string | null; punto: string | null; rto: number | null; checks: Record<string, number>; verify: string | null; result: "ok" | "fallo"; detail: string | null; prueba: boolean };
export type DatosRespaldos = { entorno: string; ultimos: Partial<Record<Tipo, Respaldo>>; lista: Respaldo[]; simulacros: Simulacro[]; atrasado: boolean; restauracionFallo: boolean; sinRestaurar: boolean; horasBase: number | null };

const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const COLS = `id::text, kind, ${ISO("started_at")} as at, ${ISO("finished_at")} as fin, bytes::float as bytes, sha256 as sha, destino, result, detail, is_test as prueba`;

export async function respaldosAdmin(): Promise<DatosRespaldos> {
  const [u, l, s, h] = await Promise.all([
    db().query<Respaldo>(`select distinct on (kind) ${COLS} from backup_runs order by kind, started_at desc`),
    db().query<Respaldo>(`select ${COLS} from backup_runs order by started_at desc limit 20`),
    db().query<Simulacro>(`select id::text, ${ISO("started_at")} as at, ${ISO("finished_at")} as fin, ${ISO("point_at")} as punto, rto_s as rto, checks, verify_sql as verify, result, detail, is_test as prueba
                             from restore_drills order by started_at desc limit 10`),
    db().query<{ horas: number | null }>(`select extract(epoch from now() - max(finished_at))::float / 3600 as horas from backup_runs where kind = 'base' and result = 'ok'`),
  ]);
  const horas = h.rows[0]?.horas ?? null;
  const ult = s.rows[0];
  return {
    entorno: ENTORNO, ultimos: Object.fromEntries(u.rows.map((x) => [x.kind, x])), lista: l.rows, simulacros: s.rows,
    horasBase: horas == null ? null : Math.round(horas), atrasado: horas == null || horas > ATRASO_H, restauracionFallo: ult?.result === "fallo",
    sinRestaurar: !s.rows.some((x) => x.result === "ok" && Date.now() - new Date(x.at).getTime() < SIN_RESTAURAR_DIAS * 86_400_000),
  };
}
