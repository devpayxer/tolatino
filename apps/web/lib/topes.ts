import "server-only";
import { huella } from "./cifrado";
import { db } from "./db";

/* 9b-3 · Los topes por minuto y los corta-circuitos, COMPARTIDOS entre procesos (rate_counters, 0133). Antes vivían en la memoria de cada
   proceso de la app: con varias réplicas cada una contaba por su cuenta (el tope se multiplicaba) y cada una cortaba por su cuenta.
   Guardián topeCompartido: ningún tope por minuto ni corte en la memoria de un proceso; todo pasa por aquí.
   - La clave nunca es el dato (dirección, teléfono, cookie): es su huella con la llave del entorno (lib/cifrado).
   - Una sola sentencia por tope (tope_sumar): dos procesos nunca leen la misma cuenta.
   - Si la base no responde, el tope dice «no» (cerrado): lo que cuida un tope no se abre porque falte el contador. */

export type Scope = "errores" | "errores_dev" | "errores_ip" | "errores_descartados" | "errores_servidor" | "pase_ws" | "ruta_pos" | "qr" | "lista" | "dir" | "vivo";
const clave = (k: string) => huella(`tope:${k}`).slice(0, 40);

/* Suma uno (o n) a la ventana de este minuto (o de ventanaS segundos) y devuelve la cuenta. */
export async function sumarTope(scope: Scope, k: string, o: { ventanaS?: number; n?: number } = {}): Promise<number> {
  const r = await db().query<{ n: number }>(`select tope_sumar($1, $2, $3::int, $4::int) as n`, [scope, clave(k), o.ventanaS ?? 60, o.n ?? 1]);
  return r.rows[0]?.n ?? Number.MAX_SAFE_INTEGER;
}

/* ¿Entra uno más? Suma y compara (lo que se pasa también cuenta: quien insiste sigue afuera hasta el minuto siguiente). */
export async function dentroDelTope(scope: Scope, k: string, tope: number, ventanaS = 60): Promise<boolean> {
  try {
    return (await sumarTope(scope, k, { ventanaS })) <= tope;
  } catch {
    return false;
  }
}

/* Lo sumado en las últimas horas (lo que el barrido todavía no purgó: 24 h para errores_descartados, 10 min para lo demás). */
export async function sumaReciente(scope: Scope, k: string, horas = 24): Promise<number> {
  const r = await db().query<{ n: number }>(`select tope_suma($1, $2, $3::int) as n`, [scope, clave(k), horas]).catch(() => null);
  return r?.rows[0]?.n ?? 0;
}

/* ── Corta-circuito compartido ──
   cerrado = se llama · abierto = no se llama (responde al instante sin servicio) · prueba = pasó el corte y ESTE proceso prueba una vez (los
   demás siguen viendo abierto mientras tanto). Si la base no responde, se llama igual (el servicio tiene su propio límite de tiempo). */
export type Corte = "traductor" | "moderacion_img";
export async function estadoCorte(nombre: Corte, corteMs: number): Promise<"cerrado" | "abierto" | "prueba"> {
  const r = await db().query<{ e: "cerrado" | "abierto" | "prueba" }>(`select corte_estado($1, $2::int) as e`, [nombre, Math.ceil(corteMs / 1000)]).catch(() => null);
  return r?.rows[0]?.e ?? "cerrado";
}
export async function resultadoCorte(nombre: Corte, ok: boolean, fallasParaCortar: number): Promise<void> {
  await db().query(`select corte_resultado($1, $2, $3::int)`, [nombre, ok, fallasParaCortar]).catch(() => undefined);
}
/* Para el Super Admin: ¿está cortado ahora? (sin tomar la prueba). */
export async function corteAbierto(nombre: Corte, corteMs: number): Promise<boolean> {
  const r = await db().query<{ a: boolean }>(
    `select exists (select 1 from rate_counters where scope = 'corte' and key_hash = $1 and window_start > clock_timestamp() - make_interval(secs => $2::int)) as a`,
    [nombre, Math.ceil(corteMs / 1000)]).catch(() => null);
  return r?.rows[0]?.a ?? false;
}

/* El barrido: las ventanas viejas se purgan (topes_purgar, 0133; los cortes no: los cierra el primer éxito). */
export async function purgarTopes(): Promise<number> {
  return (await db().query<{ n: number }>(`select topes_purgar() as n`)).rows[0]?.n ?? 0;
}
