/* 9t9 · Un elemento malo no detiene a los demás (los barridos de dinero; lib/barrido.ts).
   El barrido central ya corre cada tarea aparte, pero DENTRO de una tarea un solo elemento que lanzaba detenía a todos los que venían detrás, en cada
   corrida, para siempre (CI 44940985674: un plan con su intención rota dejó sin cobrar a todos los planes de la lista). Aquí cada elemento corre por su
   cuenta: si uno lanza, queda su línea en el registro del servidor y se sigue con los demás; al terminar, si hubo fallidos, se lanza UN error que dice
   cuántos de cuántos fallaron y cuáles, para que la tarea quede fallida en system_jobs (Sistema › Tareas) y el equipo lo vea. Nunca se traga un error.
   Guardián barridoUnoPorUno: las funciones de barrido de dinero usan este ayudante y sus selecciones con tope llevan su orden. */

const TOPE = 300; // como el error de una tarea en lib/barrido.ts

const msg = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 200);

/* Para una función con varios pasos: cada paso y cada elemento por su cuenta, y al final un solo error con todos los fallidos. */
export class Fallos {
  private readonly ids: string[] = [];
  private total = 0;
  constructor(readonly tarea: string) {}
  /* Un elemento (o un paso entero): si lanza, se anota y se sigue. Devuelve lo que devolvió, o undefined si falló. */
  async uno<R>(id: string, f: () => Promise<R>): Promise<R | undefined> {
    this.total++;
    try { return await f(); } catch (e) {
      this.ids.push(id);
      console.error(`[barrido] ${this.tarea} · ${id}: ${msg(e)}`);
      return undefined;
    }
  }
  /* Cada elemento de la lista, uno por uno, en orden. */
  async cada<T>(lista: readonly T[], idDe: (x: T) => string, f: (x: T) => Promise<unknown>): Promise<void> {
    for (const x of lista) await this.uno(idDe(x), () => f(x));
  }
  get fallidos(): number { return this.ids.length; }
  /* Al terminar: si algo falló, la tarea sale fallida con el resumen (los demás ya corrieron). */
  fin(): void {
    if (!this.ids.length) return;
    throw new Error(`${this.tarea}: ${this.ids.length} de ${this.total} fallaron (${this.ids.join(", ")})`.slice(0, TOPE));
  }
}

/* 9t9 · Nada queda fuera por un tope: tandas de `tope` (lo más atrasado primero, lo decide la consulta) sin repetir en la corrida lo que ya se recorrió
   (traer recibe los ids vistos y los deja fuera: un elemento que sigue tocando —falla siempre, o Stripe no contesta— no vuelve a ocupar la tajada y los
   de detrás pasan en la misma corrida). Hasta `tandas` tandas por corrida; lo que quede, la siguiente (otra vez lo más atrasado primero). */
export async function porTandas<T>(b: Fallos, tope: number, traer: (vistos: string[]) => Promise<T[]>, idDe: (x: T) => string, f: (x: T) => Promise<unknown>,
  o: { clave?: (x: T) => string; tandas?: number } = {}): Promise<void> {
  const vistos: string[] = [], clave = o.clave ?? idDe;
  for (let t = 0; t < (o.tandas ?? 20); t++) {
    const L = await traer(vistos);
    await b.cada(L, idDe, f);
    vistos.push(...L.map(clave));
    if (L.length < tope) break;
  }
}

/* Lo común: una sola lista. */
export async function cadaUno<T>(tarea: string, lista: readonly T[], idDe: (x: T) => string, f: (x: T) => Promise<unknown>): Promise<void> {
  const b = new Fallos(tarea);
  await b.cada(lista, idDe, f);
  b.fin();
}
