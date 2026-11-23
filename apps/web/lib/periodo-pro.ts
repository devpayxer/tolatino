/* 23 nov · El fin de un período pagado de Pro (mensual o anual). Función PURA: sin base, sin reloj, sin importaciones (lib/suscripcion.ts la usa al
   cobrar y al completar la verificación del banco; el guardián periodoProSinDesborde ejecuta su tabla de casos contra este archivo).

   LA REGLA: el período termina el mismo día del mes siguiente (o del mismo mes del año siguiente, en el anual); si ese mes no tiene ese día, su
   último día. El día que manda es el del ANCLA: el día en que empezó el primer período pagado de esta racha de Pro, no el día recortado. Así
   31 ene → 28 feb → 31 mar (no 28 mar), y el anual que empezó el 29 feb → 28 feb → … → 29 feb del siguiente bisiesto. La hora es la del ancla en
   la zona de la ciudad: un cambio de horario no mueve la hora del cobro (las 10 de la mañana siguen siendo las 10 de la mañana).

   Antes (hasta el 23 nov) se sumaba con Date#setMonth en la hora del proceso: el 31 ene daba 3 mar (se saltaba febrero), el 31 mar daba 1 may, y la
   fecha quedaba corrida para siempre; con el proceso en UTC, la hora local del cobro se movía una hora en marzo y en noviembre.

   Sin ancla, o con un ancla que no cuadra con el inicio del período (una fecha que ya venía corrida de antes del 23 nov, un ancla posterior), el
   ancla es el propio inicio: el negocio sigue con su día de hoy, nada se recalcula hacia atrás y nadie gana días. */

export type Ciclo = "month" | "year";
type Partes = { y: number; m: number; d: number; h: number; mi: number; s: number; ms: number };

const formatos = new Map<string, Intl.DateTimeFormat>();
function formato(zona: string): Intl.DateTimeFormat {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatos.set(zona, f);
  }
  return f;
}
/* La fecha y la hora de pared de un instante en una zona. */
export function partesEn(t: number, zona: string): Partes {
  const p: Record<string, number> = {};
  for (const x of formato(zona).formatToParts(new Date(t))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return { y: p.year!, m: p.month!, d: p.day!, h: p.hour! % 24, mi: p.minute!, s: p.second!, ms: ((t % 1000) + 1000) % 1000 };
}
/* Los días de un mes (m de 1 a 12): el día 0 del mes siguiente es el último de este. */
export const diasDelMes = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();
/* El día que toca en un mes para un ancla: el mismo, o el último del mes si no lo tiene. */
export const diaQueToca = (y: number, m: number, diaAncla: number): number => Math.min(diaAncla, diasDelMes(y, m));

/* El instante de una hora de pared en una zona. Una hora que no existe (la que se salta en marzo) cae en la de después del salto; una que existe dos
   veces (la que se repite en noviembre), en la primera. */
function deParedAInstante(p: Partes, zona: string): number {
  const w = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s, p.ms);
  const desfase = (t: number) => { const q = partesEn(t, zona); return Date.UTC(q.y, q.m - 1, q.d, q.h, q.mi, q.s, q.ms) - t; };
  const antes = desfase(w - 86_400_000), despues = desfase(w + 86_400_000);
  const cuadra = (t: number) => { const q = partesEn(t, zona); return q.y === p.y && q.m === p.m && q.d === p.d && q.h === p.h && q.mi === p.mi && q.s === p.s; };
  const c = [w - antes, w - despues].filter(cuadra).sort((a, b) => a - b);
  return c.length ? c[0]! : w - antes;
}

/* El fin del período que empieza en `desde` (ms). `ancla` (ms): el inicio del primer período pagado de la racha (null si este es el primero).
   `zona`: la de la ciudad del negocio (cities.timezone). Devuelve ms. */
export function finDePeriodo(desde: number, ciclo: Ciclo, zona: string, ancla: number | null = null): number {
  if (!Number.isFinite(desde)) throw new RangeError("finDePeriodo: el inicio del período no es una fecha");
  const D = partesEn(desde, zona);
  let A = ancla != null && Number.isFinite(ancla) && ancla <= desde ? partesEn(ancla, zona) : D;
  if (D.d !== diaQueToca(D.y, D.m, A.d)) A = D; // el inicio no cuadra con el ancla: manda el inicio (nada hacia atrás)
  const n = ciclo === "year" ? 12 : 1, k = D.m - 1 + n, y = D.y + Math.floor(k / 12), m = (k % 12) + 1;
  return deParedAInstante({ y, m, d: diaQueToca(y, m, A.d), h: A.h, mi: A.mi, s: A.s, ms: A.ms }, zona);
}
