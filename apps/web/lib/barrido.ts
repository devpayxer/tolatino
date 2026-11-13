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
      const [citas, mesas, pedidos, mercado, apartados, layaway, planes, rentas, fiestas, viajes, solicitudes, totales, ayuda, cobros, estimados, noche, nocheR, edu, ninos, ninosP, dep, insc, fe, inm, autos, lic, vis, com, mod, hoy, tab, inv, cup, av, rsvp, bol, desp, espera] = await Promise.all([
        import("./citas-flujo"), import("./reservas"), import("./pedidos"), import("./mercado"), import("./apartados"), import("./layaway"), import("./planes"), import("./rentas"),
        import("./fiestas-reservas"), import("./viajes"), import("./solicitudes"), import("./total-escrito"), import("./ayuda"), import("./cobros"), import("./estimados"), import("./noche"), import("./noche-reservas"), import("./edu"), import("./ninos"), import("./ninos-privado"), import("./deporte"), import("./inscripciones"), import("./fe"), import("./inmuebles"), import("./autos"), import("./licencias"), import("./visitas-inm"), import("./comunidad-hilo"), import("./moderacion"), import("./hoy"), import("./tabla"), import("./invitar"), import("./cupones"), import("./avisos"), import("./rsvp"), import("./boletos"), import("./boletos-despues"), import("./espera")]);
      const [cxs, liq, ser, pta, paq, evp, eav] = await Promise.all([import("./evt-cambios"), import("./evt-liquidacion"), import("./evt-series"), import("./puerta"), import("./puerta-paquete"), import("./evento-privado"), import("./evt-avisos")]);
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
        // Cupones por monedas (5g): los códigos que vencieron sin usarse pasan a vencidos y sus monedas vuelven (asiento inverso), con aviso.
        ["vencerCupones", () => cup.vencerCupones()], ["resumenComunidad", () => av.resumenComunidad()],
        // Eventos (6b): el RSVP guarda el lugar hasta las puertas + rsvp_guarda_min (después vence y el lugar se libera); al abrir puertas,
        // el aviso de hasta cuándo se guarda; el día antes, el recordatorio a quien va y a quien guardó el evento (una vez por fecha).
        ["rsvpVencer", () => rsvp.vencerRsvp()], ["evtRecordatorios", () => rsvp.barrerRecordatoriosEvt()],
        // Boletos (6c): el apartado vence a evt_apartado_min (la existencia vuelve y la autorización sin orden se libera); una compra
        // cortada entre la orden y la captura se captura o se anula (nada se cobra sin boleto).
        ["evtApartados", () => bol.vencerApartados()], ["boletosReparar", () => bol.repararBoletos()],
        // Después de comprar (6d): lo que nadie recibió a tiempo vuelve a quien lo mandó (QR nuevo); las ofertas de la lista de espera
        // que vencen pasan a la siguiente y lo libre se ofrece en orden; una devolución de boletos que Stripe no hizo se reintenta con su llave.
        ["bolTransferencias", () => desp.vencerTransferencias()], ["espera", () => espera.barrerEspera()], ["bolDevoluciones", () => desp.barrerDevolucionesBoletos()],
        // Cambios del evento y dinero del organizador (6e): las cancelaciones que quedaron a medias siguen (devolución total por orden, una vez)
        // con sus avisos; la liquidación del martes por fecha (retener o transferir; la base decide los montos); lo que quedó en camino se
        // reintenta con la misma llave; un ajuste sin liquidación siguiente revierte la transferencia.
        // Series (6f): las fechas que el horizonte de Configuración ya alcanza se crean solas (evt_dias_adelante) y las que pasaron quedan 'done'.
        ["evtSeries", () => ser.extenderSeries()],
        // La puerta (6g): las sesiones que quedaron abiertas después de la ventana del día se cierran solas; una hora antes de las puertas,
        // a los porteros de ese evento les llega «Hoy escaneas en la puerta» (una vez por fecha y portero).
        ["puertaSesiones", () => pta.vencerSesionesPuerta()], ["puertaAbre", () => pta.barrerPuertaAbre()],
        // Sin conexión (6h): el paquete de una puerta vence al final de la fecha + puerta_paquete_h (queda revocado; el teléfono lo borra).
        ["puertaPaquetes", () => paq.vencerPaquetes()],
        // Evento privado (6i): sin respuesta a tiempo, propuesta o cambio que vencen, el recordatorio del día antes, «Pasó el evento» y las
        // devoluciones que Stripe no hizo (con la misma llave: una sola).
        ["eventoPrivado", () => evp.vencerEvp({})],
        // Avisos de Eventos (6j): «Mañana» y «¡Es hoy!» a quien tiene boletos (desde evt_recordatorio_hora) y «Tu evento casi se agota» al
        // organizador (evt_aforo_aviso_pct); cada uno una vez (evt_avisos_enviados).
        ["bolRecordatorios", () => eav.barrerRecordatoriosBoletos()], ["evtAforo", () => eav.barrerAforoEvt()],
        // Soporte (7b): un caso que pasó su plazo (horas hábiles del equipo) sin respuesta sube a prioridad alta y se avisa a quien lo tiene.
        ["soporte", async () => (await import("./soporte-equipo")).barrerSoporte()],
        // El Compa (7c): cerrar conversaciones sin mensajes (compa_conv_cierra_h), vencer acciones sin confirmar y soltar reservas del tope que
        // nunca volvieron (proceso caído).
        ["compaConversaciones", async () => (await import("./compa/conversacion")).cerrarConversaciones()],
        ["compaAcciones", async () => (await import("./compa/acciones")).vencerAcciones()],
        ["compaReservas", async () => { await db().query(`select compa_soltar_reservas(10)`); }],
        // 7f · Respuestas automáticas que se quedaron esperando (el proceso que contestaba se cayó: su reclamo vence a los 90 s). Si El Compa ya no
        // contesta ahí, sale lo de siempre (la respuesta fija, si el negocio la tiene).
        ["compaRespuestasAuto", async () => (await import("./compa/respuesta-auto")).contestarPendientes()],
        // 7g · Un borrador del copiloto que nadie envió en un día queda «descartado» (nada se borra; las cifras de El Compa lo cuentan).
        ["compaBorradores", async () => { await db().query(`update compa_drafts set used = 'discarded' where used is null and at < now() - interval '1 day'`); }],
        // 7h · WhatsApp y SMS: una entrada que no se procesó (el proceso se cayó) se retoma (la respuesta tardía respeta las horas de silencio y
        // la ventana de 24 h); pasada la retención se vacían el texto y el teléfono cifrado del registro de entrada y salida.
        ["compaCanales", async () => (await import("./compa/canales")).barrerCanales()],
        // 7i · La purga por retención: las conversaciones de El Compa cerradas hace más de compa_retener_meses quedan en cifras, y a los 30 días
        // de borrar una cuenta (D5) se vacían sus casos de Soporte, sus conversaciones y las fotos de esos casos (nada se borra de la base).
        ["compaRetencion", async () => (await import("./compa/purga")).barrerRetencion()],
        // 8c · Push: lo que se quedó «enviando» vuelve a la cola, los reintentos que tocan salen (espera creciente), lo vencido (push_ttl_h) se
        // deja y su SMS de respaldo sale (una vez), y los tokens sin uso (push_inactivo_dias) vencen. Idempotente.
        ["push", async () => (await import("./push/cola")).barrerPush()],
        // 8f · «Errores en vivo»: grupo nuevo, pico o regresión por build → aviso a los Admins (una vez por grupo, tipo y build), y la purga de los
        // errores y cierres de más de errores_retener_dias. Y el programa beta: los testers de TestFlight que esperan a Apple o quedaron a medias.
        ["errores", async () => (await import("./errores/vivo")).barrerErrores()],
        // 8e · La purga de la ruta del repartidor: posiciones de más de ubic_retener_dias (14 por defecto); la entrega queda con su resumen.
        ["ruta", async () => (await import("./ruta")).purgarRutas()],
        // 8g · Wallet: los avisos a Apple y Google que quedaron pendientes o con reintento, y el certificado del pase que vence.
        ["pases", async () => (await import("./pases/pases")).barrerPases()],
        ["beta", async () => (await import("./beta")).barrerBeta()],
        // 8d · Llaves de acceso: los retos vencidos hace más de un día se purgan (un uso y 2 minutos de vida; después no sirven para nada).
        ["llaves", async () => (await import("./llaves/llaves")).purgarRetos()],
        // 8h · La tubería de las tiendas: TestFlight (Apple procesó → grupo interno), Play interno pendiente, pedidos que terminaron y los jti vencidos.
        ["tiendas", async () => (await import("./tiendas/tuberia")).barrerTiendas()],
        // 9b-3 · La escala: los meses de la analítica (particiones), su resumen por día y su retención (eventos_retener_meses); el vocabulario de
        // búsqueda cada hora; los contadores compartidos de los topes (rate_counters) de más de un día.
        ["analitica", async () => (await import("./eventos")).analiticaAlDia()], ["analiticaComunidad", async () => (await import("./admin-analitica")).comunidadAlDia()],
        ["buscarVocab", async () => (await import("./buscar")).vocabularioAlDia()],
        ["topes", async () => (await import("./topes")).purgarTopes()],
        ["evtCancelaciones", () => cxs.barrerCancelaciones()], ["evtLiquidar", () => liq.liquidar()], ["evtLiquidacionesReparar", () => liq.repararLiquidaciones()], ["evtAjustes", () => liq.revertirDeudas()],
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
