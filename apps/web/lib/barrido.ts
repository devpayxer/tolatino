import "server-only";
import { db } from "./db";

/* Barrido central (LAUNCH-CHECKLIST 7 nov · decisión AB): cada minuto, aunque nadie abra una página, se vence lo que venció y
   se libera lo retenido de lo que no siguió (citas, mesas, pedidos, mercado, apartados, layaway, planes, rentas, fiestas,
   viajes, pre-estimados, emergencias, totales por escrito, ayudas que escalan), se mandan los recordatorios y se reintenta lo
   que quedó a medias con dinero. Los barridos ya existían (corrían al abrir una página); aquí solo se llaman todos.
   - Un solo barrido a la vez en todo el sistema (candado de sesión en Postgres): si el anterior sigue, este no corre.
   - Cada tarea va aparte: si una falla, las demás siguen, y queda en system_jobs (última corrida, ms, error).
   - Las que piden negocio (reparar/renovar dinero) corren solo para negocios con dinero retenido o a medias. */
type Tarea = [string, () => Promise<unknown>];
const LOCK = 913_337_001; // pg_try_advisory_lock: un número fijo solo para el barrido central

async function negociosConRetenido(): Promise<string[]> {
  return (await db().query<{ b: string }>(
    `select distinct business_id as b from payments where status = 'held' and business_id is not null
     union select distinct o.business_id from operations o where o.status = 'confirmed' and o.kind in ('appointment', 'market_order', 'hold', 'plan') and o.updated_at > now() - interval '30 days'
     limit 2000`)).rows.map((x) => x.b);
}

export type ResultadoBarrido = { corrio: boolean; ms: number; tareas: { name: string; ok: boolean; ms: number; error?: string }[] };
export async function barridoCentral(): Promise<ResultadoBarrido> {
  const t0 = Date.now(), c = await db().connect();
  try {
    const ok = (await c.query<{ ok: boolean }>(`select pg_try_advisory_lock($1) as ok`, [LOCK])).rows[0]?.ok;
    if (!ok) return { corrio: false, ms: Date.now() - t0, tareas: [] };
    try {
      const [citas, mesas, pedidos, mercado, apartados, layaway, planes, rentas, fiestas, viajes, solicitudes, totales, ayuda, cobros, estimados, noche, nocheR, edu, ninos, ninosP, dep, insc, fe, inm, autos, lic, vis, com, mod, hoy, tab, inv] = await Promise.all([
        import("./citas-flujo"), import("./reservas"), import("./pedidos"), import("./mercado"), import("./apartados"), import("./layaway"), import("./planes"), import("./rentas"),
        import("./fiestas-reservas"), import("./viajes"), import("./solicitudes"), import("./total-escrito"), import("./ayuda"), import("./cobros"), import("./estimados"), import("./noche"), import("./noche-reservas"), import("./edu"), import("./ninos"), import("./ninos-privado"), import("./deporte"), import("./inscripciones"), import("./fe"), import("./inmuebles"), import("./autos"), import("./licencias"), import("./visitas-inm"), import("./comunidad-hilo"), import("./moderacion"), import("./hoy"), import("./tabla"), import("./invitar")]);
      const T: Tarea[] = [
        ["citas", () => citas.vencerCitas({})], ["mesas", () => mesas.vencerMesas({})], ["pedidos", () => pedidos.vencer({})], ["mercado", () => mercado.vencerMercado({})],
        ["apartados", () => apartados.barrerApartados({})], ["layaway", () => layaway.barrerPlanes({})], ["planes", () => planes.barrerPlanes({})], ["rentas", () => rentas.barrerRentas({})],
        ["fiestas", () => fiestas.barrerFiestas({})], ["viajes", () => viajes.barrerViajes({})], ["solicitudes", () => solicitudes.vencerSolicitudes({})], ["emergencias", () => solicitudes.vencerEmergencias({})],
        ["totales", () => totales.vencerTotales()], ["ayudas", () => ayuda.escalarVencidas()],
        // Noche (4na): la tarjeta y los filtros cambian cuando cambia la noche (6 AM) o la fila deja de ser «ahora».
        ["noche", () => noche.barrerNoche()],
        // Noche (4nc): mesas sin respuesta, otra hora sin respuesta y «pasó la noche» a las 6 AM.
        ["nocheReservas", () => nocheR.vencerNoche({})],
        // Educación (4ea): la tarjeta y los filtros cambian cuando cambia el día (un grupo que empezó ya no es «el próximo»).
        ["edu", () => edu.barrerEdu()],
        // Niños (4eb): la tarjeta y los filtros del día, y borrar los datos de los niños 30 días después de terminar.
        ["ninos", () => ninos.barrerNinos()], ["ninosPurga", () => ninosP.purgarNinos()],
        // Deporte (4ec): la tarjeta y los filtros del día (la fecha límite de la liga, la temporada que empezó).
        ["deporte", () => dep.barrerDeporte()],
        // Iglesias (4ia): la tarjeta y los filtros del día («Se acabó por hoy» se apaga solo al cambiar el día en la ciudad).
        ["fe", () => fe.barrerFe()],
        // Bienes Raíces (4ib): las horas de visita 14 días adelante, las que ya pasaron se cierran, la tarjeta y los filtros del día.
        ["inmuebles", () => inm.barrerInm()],
        // Venta de Autos (4ic): el recálculo por lotes si cambió el tope o el impuesto, y los totales, la tarjeta y los filtros del día.
        ["autos", () => autos.barrerAutos()],
        // Inscripciones (4ee): sin respuesta a tiempo, empieza, recordatorio, terminó, baja de membresía a las 72 h y ofertas de la lista.
        ["inscripciones", () => insc.vencerInsc({})],
        // Visitas y pruebas de manejo (4ie): sin respuesta a las 4 h hábiles (nunca después de la hora − 1 h), «Pasó» a las 24 h si nadie marca
        // (abre la reseña), recordatorio 2 h antes, avisos de «ya no está disponible», horas de prueba 14 días adelante y la purga a los 30 días.
        ["visitas", () => vis.barrerVisitas({})],
        // Licencias de las tres (4ig): la verificada cuya revisión vence en 14 días o ya venció vuelve a la cola «Licencias».
        ["licencias", () => lic.barrerLicencias()],
        // Comunidad (5b): las encuestas que vencieron se cierran y el resultado se avisa una vez a quien la publicó y a quienes votaron.
        ["cerrarEncuestas", () => com.barrerEncuestas()],
        // Moderación (5d): reseñas en ráfaga sin transacción (respaldo de la revisión al guardar) y redes de cuentas (votos y seguidores
        // desde un mismo dispositivo) → caso en «Reportes de usuario».
        ["moderacion", () => mod.barrerModeracion()],
        // Hoy en el barrio y la cuenta oficial (5e): quien sigue a un negocio recibe una vez «Hoy en un negocio que sigues» cuando una
        // novedad entra a Hoy (también la programada al salir), y si una oficial programada y fijada ya salió, queda una sola fijada.
        ["hoyGuardados", () => hoy.avisarHoyGuardados()], ["fijadaUna", async () => (await db().query<{ n: number }>(`select com_fijada_una() as n`)).rows[0]?.n ?? 0],
        // Tabla del Barrio (5f): el mes que terminó queda congelado (desde ahí, 72 h para excluir) y el día 3 se cierra solo si nadie lo
        // cerró (posiciones, insignia del mes, plazas de General y el aviso a los 3 primeros). Los invitados que ya participan cuentan
        // para Capitán.
        ["tablaCongelar", () => tab.congelarMeses()], ["tablaCerrar", () => tab.cerrarPendientes()], ["referidos", () => inv.referidosActivos()],
        ["dinero", async () => { for (const b of await negociosConRetenido()) {
          await cobros.repararPagos(b).catch(() => undefined); await estimados.repararEstimados(b).catch(() => undefined); await estimados.renovarRetenciones(b).catch(() => undefined);
          await mercado.repararMercado(b).catch(() => undefined); await apartados.repararApartados(b).catch(() => undefined); await layaway.repararPlanes(b).catch(() => undefined);
        } }],
      ];
      const out: ResultadoBarrido["tareas"] = [];
      for (const [name, f] of T) {
        const t = Date.now();
        let error: string | undefined;
        try { await f(); } catch (e) { error = String((e as Error)?.message ?? e).slice(0, 300); }
        const ms = Date.now() - t;
        out.push({ name, ok: !error, ms, ...(error ? { error } : {}) });
        await db().query(
          `insert into system_jobs (name, last_run_at, last_ok_at, last_ms, last_error, runs, errors) values ($1, now(), case when $2 then now() end, $3, $4, 1, case when $2 then 0 else 1 end)
           on conflict (name) do update set last_run_at = now(), last_ok_at = case when $2 then now() else system_jobs.last_ok_at end, last_ms = $3, last_error = $4,
             runs = system_jobs.runs + 1, errors = system_jobs.errors + case when $2 then 0 else 1 end`,
          [`barrido.${name}`, !error, ms, error ?? null]).catch(() => undefined);
      }
      return { corrio: true, ms: Date.now() - t0, tareas: out };
    } finally {
      await c.query(`select pg_advisory_unlock($1)`, [LOCK]).catch(() => undefined);
    }
  } finally {
    c.release();
  }
}
