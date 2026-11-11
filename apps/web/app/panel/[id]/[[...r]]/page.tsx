import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { menuPanel } from "@/lib/menu";
import { ajustesPedidos, pedidoNegocio, pedidosHoy, pedidosLista, type FiltroPed } from "@/lib/pedidos";
import type { PedPanel } from "../../Pedidos";
import { mesaDetalle, mesasPanel, mesasPendientes, rsvAjustes, type FiltroMesa } from "@/lib/reservas";
import { citaPanel, citasLista, citasVivas, type FiltroCita } from "@/lib/citas-panel";
import { repararEstimados } from "@/lib/estimados";
import { emergenciasPanel, solicitudPanel, solicitudesPanel } from "@/lib/solicitudes";
import { planesNegocio } from "@/lib/planes";
import { rentaPanel, rentasNegocio } from "@/lib/rentas";
import { apartadoPanel, apartadosNegocio } from "@/lib/apartados";
import { oficiosPanel, rubroDe } from "@/lib/oficios";
import { ayudaCitaPanel, ayudasCitasNegocio } from "@/lib/ayuda-cita";
import { pedidosPendientes } from "@/lib/pedidos";
import { ayudaPanel, ayudasNegocio } from "@/lib/ayuda";
import type { RsvPanel } from "../../Reservas";
import { accesoPanel, datosPanel } from "@/lib/panel";
import { resenaPanel, resenasPanel, resenasSinResponder, type FiltroPanel } from "@/lib/resenas";
import type { ResPanel } from "../../ResenasPanel";
import { eventosNovedad, itemsNovedad, novedadPanel, novedadesPanel } from "@/lib/novedades";
import type { NovData } from "../../NovedadesPanel";
import type { CupData } from "../../CuponesPanel";
import { cuponesNegocio } from "@/lib/cupones";
import { horarioVac, solicitudesNuevas, vacantePanel, vacantesPanel, verSolicitud } from "@/lib/jobs";
import { db } from "@/lib/db";
import { actualizarCuenta, cobrosPanel } from "@/lib/cobros";
import { repartidoresDe } from "@/lib/repartidor";
import type { JobsData } from "../../JobsPanel";
import { Panel, type Ruta } from "../../Panel";
import type { MsjPanel } from "../../MensajesPanel";
import { conversacionNegocio, hilosNegocio } from "@/lib/mensajes";
import { serviciosPanel } from "@/lib/servicios";
import { herramientaRetail, rubroRetail } from "@/lib/retail";

/* /panel/{negocio} = Tu página · /panel/{negocio}/hoy = Hoy · /panel/{negocio}/pagina/{apartado} = un apartado de
   Tu página · ?det= abre el detalle (columna en escritorio, pantalla en el teléfono). El servidor decide quién entra. */
const SUBS = new Set(["hor", "fotos", "about", "equipo", "ver", "lic", "resenas", "nov", "cup"]);
const DET = /^(stf:(new|[0-9a-f-]{36})|(item|mcat|mgrp):(new|\d{1,18})|ped:\d{1,12}|rsv:R-\d{1,10}|rev:\d{1,18}|nov:(new|(edit|dup):\d{1,18}|\d{1,18})|cup:(new|edit:\d{1,18})|vac:(new|(edit|dup):\d{1,18}|\d{1,18})|vap:\d{1,18}|msg:\d{1,18}|svc:(new|new:extra|\d{1,18})|svm|of:(new|new:\d{1,18}|\d{1,18})|cita:C-\d{1,10}|noche:N-\d{1,10}|insc:I-\d{1,10}|vis:D-\d{1,10}|grp:(new|list):\d{1,18}|fe:hor:new|inm:(new|\d{1,18})|auto:(new|\d{1,18})|sol:[PQE]-\d{1,10}|renta:T-\d{1,10}|apt:A-\d{1,10}|merc:M-\d{1,10}|fiesta:F-\d{1,10}|evp:(aj|EP-\d{1,10})|viaje:V-\d{1,10}|salida:\d{1,18}|evt:(new(:[a-z]{2,12})?|edit:\d{1,18}|\d{1,18}(@\d{1,18})?)|door:\d{1,18}@\d{1,18})$/;
const FILTROS = new Set(["all", "pend", "cur", "done", "no"]);

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; r?: string[] }>; searchParams: Promise<{ det?: string; f?: string; q?: string; antes?: string; t?: string; vuelta?: string }> }) {
  const [{ id, r = [] }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/panel/${id}${r.length ? `/${r.join("/")}` : ""}`)}`);
  let ruta: Ruta;
  if (r.length === 0) ruta = { sec: "pag", sub: null, det: null };
  else if (r.length === 1 && r[0] === "hoy") ruta = { sec: "hoy", sub: null, det: null };
  else if (r.length === 1 && r[0] === "clientes") ruta = { sec: "cli", sub: null, det: null };
  else if (r.length === 1 && r[0] === "mensajes") ruta = { sec: "msg", sub: null, det: null };
  else if (r.length === 2 && r[0] === "pagina" && SUBS.has(r[1]!)) ruta = { sec: "pag", sub: r[1]!, det: null };
  else if (r.length === 1 && r[0] === "vendes") ruta = { sec: "mod", sub: null, det: null };
  else if (r.length === 1 && r[0] === "entrega") ruta = { sec: "dlv", sub: null, det: null };
  else if (r.length === 1 && r[0] === "mas") ruta = { sec: "mas", sub: null, det: null };
  else if (r.length === 1 && r[0] === "compa") ruta = { sec: "cpa", sub: null, det: null };
  else if (r.length === 1 && r[0] === "eventos") ruta = { sec: "evt", sub: null, det: null };
  else if (r.length === 1 && r[0] === "cobros") ruta = { sec: "pay", sub: null, det: null };
  else if (r.length === 2 && r[0] === "cobros" && r[1] === "plan") ruta = { sec: "pay", sub: "plan", det: null };
  else if (r.length === 2 && r[0] === "vendes" && (r[1] === "menu" || r[1] === "pedidos" || r[1] === "reservaciones" || r[1] === "jobs" || r[1] === "servicios" || r[1] === "citas" || r[1] === "sillas" || r[1] === "herramienta" || r[1] === "productos" || r[1] === "inscripciones" || r[1] === "propiedades" || r[1] === "inventario" || r[1] === "visitas")) ruta = { sec: "mod", sub: r[1], det: null };
  else notFound();
  if (typeof sp.det === "string" && DET.test(sp.det)) ruta.det = sp.det;
  const acc = await accesoPanel(id, ruta.sec === "hoy" || ruta.sec === "cli" ? "ord" : ruta.sec === "msg" ? "msg" : ruta.sec === "mod" ? "cat" : ruta.sec === "dlv" ? "dlv" : ruta.sec === "pay" ? "pay" : ruta.sec === "evt" ? "evt" : ruta.sec === "mas" || ruta.sec === "cpa" ? undefined : "page");
  if (!acc) {
    const es = lang === "es";
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-2 px-5">
        <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">{es ? "SIN ACCESO" : "NO ACCESS"}</span>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.04em]">{es ? "Sin acceso a esta área" : "No access to this area"}</h1>
        <p className="text-[13.5px] text-text-2">{es ? "Pídele acceso al dueño del negocio." : "Ask the business owner for access."}</p>
      </main>
    );
  }
  const d = await datosPanel(acc, lang);
  if (!d) notFound();
  // Sin cobros con tarjeta (no es comida): Cobros y plan abre directo «Tu plan». 6e: un organizador de eventos (módulo Eventos encendido) sí
  // ve Cobros con tarjeta: ahí conecta su cuenta y ve PAGOS DE EVENTOS (la liquidación del martes por fecha).
  const organiza = ruta.sec === "pay" && !ruta.sub && d.cat !== "NEG-FOOD" ? !!(await db().query(`select 1 from businesses where id = $1 and 'eventos' = any(modules_on)`, [d.id])).rowCount : false;
  if (ruta.sec === "pay" && !ruta.sub && d.cat !== "NEG-FOOD" && !organiza) ruta.sub = "plan";
  // Lo que vendes · Menú (Comida): el menú del negocio, calculado en el servidor.
  const menu = ruta.sec === "mod" && d.cat === "NEG-FOOD" ? await menuPanel(d.id) : ruta.sec === "mod" && (d.cat === "NEG-MERC" || d.cat === "NEG-TIENDA") ? await menuPanel(d.id, "shop") : undefined;
  // Pedidos (Comida): lo que pide cada sección, y el detalle solo con acceso a «Hoy y pedidos».
  const food = d.cat === "NEG-FOOD", ord = acc.partes.includes("all") || acc.partes.includes("ord");
  if ((ruta.det?.startsWith("ped:") || ruta.det?.startsWith("rsv:")) && !(food && ord)) ruta.det = null;
  const f = (FILTROS.has(sp.f ?? "") ? sp.f : "all") as FiltroPed, q = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  const ped: PedPanel | undefined = food ? {
    hoy: ruta.sec === "hoy" || (ruta.sec === "mod" && ruta.sub === "pedidos") ? await pedidosHoy(d.id) : undefined,
    lista: ruta.sec === "cli" && sp.t !== "rsv" ? await pedidosLista(d.id, f, q, typeof sp.antes === "string" ? sp.antes : null) : undefined, f, q,
    det: ruta.det?.startsWith("ped:") ? await pedidoNegocio(d.id, ruta.det.slice(4)) : undefined,
    aj: ruta.sec === "mod" || ruta.sec === "dlv" ? await ajustesPedidos(d.id) : undefined,
    ayuda: ruta.det?.startsWith("ped:") && ord ? await ayudaPanel(d.id, ruta.det.slice(4)) : undefined,
    ayudas: ruta.sec === "hoy" && ord ? await ayudasNegocio(d.id) : undefined,
  } : undefined;
  // Reservaciones (Comida): las vivas para Hoy y el módulo, la lista de Clientes (?t=rsv), el detalle y los ajustes.
  const tRsv = ruta.sec === "cli" && sp.t === "rsv";
  const rsv: RsvPanel | undefined = food ? {
    vivas: ord && (ruta.sec === "hoy" || (ruta.sec === "mod" && ruta.sub === "reservaciones")) ? (await mesasPanel(d.id, lang)).filas : undefined,
    lista: tRsv && ord ? await mesasPanel(d.id, lang, { estado: f as FiltroMesa, q, antes: typeof sp.antes === "string" ? sp.antes : null }) : undefined, f: f as FiltroMesa, q,
    pendPed: ruta.sec === "cli" && tRsv ? await pedidosPendientes(d.id) : undefined, pendRsv: ruta.sec === "cli" ? await mesasPendientes(d.id) : undefined,
    det: ruta.det?.startsWith("rsv:") ? await mesaDetalle(d.id, ruta.det.slice(4)) : undefined,
    aj: ruta.sec === "mod" ? (await rsvAjustes(d.id)) ?? undefined : undefined,
  } : undefined;
  // Reseñas (Tu página › Reseñas, su detalle y «Reseñas sin responder» en Hoy). Ver y responder piden acceso a Tu página.
  const pag = acc.partes.includes("all") || acc.partes.includes("page");
  const fRes = (["all", "norep", "5", "low"].includes(sp.f ?? "") ? sp.f : "all") as FiltroPanel;
  const res: ResPanel = {
    lista: ruta.sec === "pag" && ruta.sub === "resenas" ? await resenasPanel(d.id, fRes) : undefined, f: fRes,
    det: ruta.det?.startsWith("rev:") && pag ? await resenaPanel(d.id, ruta.det.slice(4)) : undefined,
    hoy: ruta.sec === "hoy" && pag && d.pro ? await resenasSinResponder(d.id) : undefined,
  };
  // Novedades (Tu página › Novedades, su detalle y el editor).
  const nd = ruta.det?.startsWith("nov:") && pag ? ruta.det.slice(4) : null, nid = nd ? nd.replace(/^(edit|dup):/, "") : null;
  const nov: NovData = {
    lista: ruta.sec === "pag" && ruta.sub === "nov" ? await novedadesPanel(d.id) : undefined,
    det: nid && /^\d+$/.test(nid) ? await novedadPanel(d.id, nid) : undefined,
    items: nd && (nd === "new" || /^(edit|dup):/.test(nd)) ? await itemsNovedad(d.id) : undefined,
    eventos: nd && (nd === "new" || /^(edit|dup):/.test(nd)) ? await eventosNovedad(d.id) : undefined,
  };
  // Cupones por monedas (5g · Tu página › Cupones por monedas y su editor): piden acceso a «Tu página».
  const cup: CupData = { lista: pag && ((ruta.sec === "pag" && ruta.sub === "cup") || ruta.det?.startsWith("cup:")) ? await cuponesNegocio(d.id) : undefined };
  // Jobs (Lo que vendes › Jobs, la vacante, la solicitud y el editor; «Solicitudes nuevas» en Hoy). Piden acceso a
  // «Lo que vendes»: las solicitudes traen nombre y teléfono. Abrir una solicitud nueva la marca «vista».
  const cat = acc.partes.includes("all") || acc.partes.includes("cat");
  const vd = cat && d.pro && /^va[cp]:/.test(ruta.det ?? "") ? ruta.det! : null;
  let jobId: string | null = vd?.startsWith("vac:") ? vd.slice(4).replace(/^(edit|dup):/, "") : null, appId: string | null = null;
  if (vd?.startsWith("vap:")) {
    appId = vd.slice(4);
    await verSolicitud(d.id, appId);
    jobId = (await db().query<{ j: string }>(`select job_id::text as j from job_applications where id = $1::bigint and business_id = $2`, [appId, d.id])).rows[0]?.j ?? null;
  }
  const jobs: JobsData = {
    lista: ruta.sec === "mod" && (ruta.sub === null || ruta.sub === "jobs") && cat ? await vacantesPanel(d.id) : undefined,
    det: jobId && /^\d+$/.test(jobId) ? await vacantePanel(d.id, jobId) : undefined, app: appId,
    hor: vd && /^vac:(new|edit:|dup:)/.test(vd) ? await horarioVac(d.id) : undefined,
    hoy: ruta.sec === "hoy" && cat && d.pro ? await solicitudesNuevas(d.id) : undefined,
  };
  if (ruta.det && /^va[cp]:/.test(ruta.det) && !cat) ruta.det = null;
  // Cobros (solo el dueño): al volver de Stripe se lee el estado real de la cuenta.
  if (ruta.sec === "pay" && sp.vuelta) await actualizarCuenta(d.id).catch(() => undefined);
  // 6e · Cobros también muestra los pagos de eventos por fecha (la liquidación del martes).
  const cob = ruta.sec === "pay" && ruta.sub !== "plan" ? { ...(await cobrosPanel(d.id)), eventos: await (await import("@/lib/evt-liquidacion")).liquidacionesPanel(d.id, null) } : undefined;
  // Tu plan (Cobros y plan): el estado del plan, los recibos y las tarjetas guardadas del dueño.
  const plan = ruta.sec === "pay" && ruta.sub === "plan" ? await (async () => {
    const S = await import("@/lib/suscripcion"), { pasarela } = await import("@/lib/pagos/pasarela"), { misTarjetas } = await import("@/lib/cobros");
    return { plan: await S.planDe(d.id), recibos: await S.recibosPro(d.id), modo: pasarela.modo(), pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(acc.yo.id) };
  })() : undefined;
  // Repartidores: Entrega (Tus repartidores, cuadre) y el detalle de un pedido de delivery (despacho).
  const reps = food && (ruta.sec === "dlv" || ruta.det?.startsWith("ped:")) ? await repartidoresDe(d.id) : undefined;
  // Mensajes (2p): la lista, la conversación (marca leído) y «Mensajes sin responder» en Hoy. Piden acceso a Mensajes.
  const vMsg = acc.partes.includes("all") || acc.partes.includes("msg");
  // 7f · Respuestas automáticas de El Compa: Panel › El Compa (sus ajustes solo para quien lleva Mensajes: lo decide ajustesAuto) y Mensajes
  // («El Compa contesta por ti», «Sugerir respuesta con El Compa»). Lecturas baratas y a prueba de fallas: si fallan, la pantalla es la de siempre.
  const RA = ruta.sec === "cpa" || (ruta.sec === "msg" && vMsg) ? await import("@/lib/compa/respuesta-auto") : null;
  if (ruta.det?.startsWith("msg:") && !vMsg) ruta.det = null;
  const msj: MsjPanel = {
    lista: ruta.sec === "msg" && vMsg ? await hilosNegocio(d.id, "todas", typeof sp.antes === "string" ? sp.antes : null) : undefined,
    det: ruta.det?.startsWith("msg:") ? await conversacionNegocio(d.id, ruta.det.slice(4)) : undefined,
    hoy: ruta.sec === "hoy" && vMsg ? (await hilosNegocio(d.id, "sin")).hilos.slice(0, 5) : undefined,
    n: vMsg ? (await db().query<{ n: number }>(`select count(*)::int as n from chat_threads where business_id = $1 and biz_unread > 0`, [d.id])).rows[0]?.n ?? 0 : 0,
    compa: ruta.sec === "msg" && RA ? await RA.estadoAutoMensajes(d.id).catch(() => null) : null,
    sugerir: ruta.det?.startsWith("msg:") && RA ? await RA.sugerirDisponible(d.id).catch(() => false) : false,
  };
  // Servicios y citas (Fase 3): Lo que vendes de un negocio de citas (servicios, reglas, sillas) y el editor.
  const conCitas = d.mods.some((m) => m === "svc" || m === "citas") || d.cat === "NEG-BELL";
  // Auto y Hogar (Fase 4): sus servicios con forma de cobrar y Tu herramienta, en vez de los de Belleza.
  const oficio = !!rubroDe(d.cat), catOk = acc.partes.includes("all") || acc.partes.includes("cat");
  // Noche (4na): en Hoy también, para cambiar la fila de esta noche (la puerta: basta «Hoy y pedidos»).
  const nocheHoy = d.cat === "NEG-NOCHE" && ruta.sec === "hoy" && (catOk || acc.partes.includes("ord"));
  const svc = conCitas && !oficio && (((ruta.sec === "mod" || ruta.det?.startsWith("svc:") || ruta.det?.startsWith("grp:") || ruta.det?.startsWith("fe:") || ruta.det?.startsWith("inm:") || ruta.det?.startsWith("auto:") || ruta.det === "svm") && catOk) || nocheHoy) ? await serviciosPanel(d.id) : undefined;
  const ofi = oficio && (ruta.sec === "mod" || ruta.det?.startsWith("of:")) && catOk ? (await oficiosPanel(d.id, d.cat)) ?? undefined : undefined;
  if (ruta.det?.startsWith("of:") && !ofi) ruta.det = null;
  // Mercados y Tiendas (4n): Tu herramienta (Balanza y pedidos / Tallas y apartados).
  const ret = rubroRetail(d.cat) && ruta.sec === "mod" && catOk ? (await herramientaRetail(d.id)) ?? undefined : undefined;
  // Mercados (4p): los pedidos de hoy, el detalle (pesar, no hay, mandar) y los productos para proponer un sustituto.
  const mercOk = d.cat === "NEG-MERC" && (acc.partes.includes("all") || acc.partes.includes("ord"));
  if (ruta.det?.startsWith("merc:") && !mercOk) ruta.det = null;
  const mped = mercOk ? await (async () => {
    const M = await import("@/lib/mercado");
    if (ruta.sec === "hoy") await (await import("@/lib/cobros")).repararPagos(d.id).catch(() => undefined);
    return {
      hoy: ruta.sec === "hoy" ? await M.mercadoHoy(d.id) : undefined,
      det: ruta.det?.startsWith("merc:") ? await M.vistaMercado(ruta.det.slice(5), { negocio: d.id }) : undefined,
      prods: ruta.det?.startsWith("merc:") ? (await M.opcionesMercado(d.id, null))?.prods.filter((p) => p.puede).map((p) => ({ id: p.id, name: p.name, cents: p.cents, k: p.k })) : undefined,
    };
  })() : undefined;
  // Fiestas (4v): las solicitudes de fecha que esperan respuesta, las próximas y el detalle. Responder pide «Hoy y pedidos».
  const fiesOk = d.cat === "NEG-FIESTA" && ord;
  if (ruta.det?.startsWith("fiesta:") && !fiesOk) ruta.det = null;
  const fies = fiesOk ? await (async () => {
    const F = await import("@/lib/fiestas-reservas");
    if (ruta.sec === "hoy") await (await import("@/lib/cobros")).repararPagos(d.id).catch(() => undefined);
    return { hoy: ruta.sec === "hoy" ? await F.fiestasHoy(d.id) : undefined, det: ruta.det?.startsWith("fiesta:") ? await F.fiestaPanel(d.id, ruta.det.slice(7)) : undefined };
  })() : undefined;
  // Transporte (4y-1): los viajes que esperan respuesta, las salidas con pasajeros, el vehículo completo y el detalle.
  const viaOk = d.cat === "NEG-TRANS" && ord;
  if ((ruta.det?.startsWith("viaje:") || ruta.det?.startsWith("salida:")) && !viaOk) ruta.det = null;
  const via = viaOk ? await (async () => {
    const V = await import("@/lib/viajes");
    if (ruta.sec === "hoy") await (await import("@/lib/cobros")).repararPagos(d.id).catch(() => undefined);
    return { hoy: ruta.sec === "hoy" || ruta.det?.startsWith("salida:") ? await V.viajesHoy(d.id) : undefined, det: ruta.det?.startsWith("viaje:") ? await V.viajePanel(d.id, ruta.det.slice(6)) : undefined };
  })() : undefined;
  // Citas (Belleza): las vivas para Hoy, Clientes › Citas y el detalle. Responder pide «Hoy y pedidos».
  if (ruta.det?.startsWith("cita:") && !(conCitas && ord)) ruta.det = null;
  // Auto y Hogar (4d): al mirar Hoy se reintenta lo que quedó a medias (cobros de una liquidación, retenciones de citas
  // que ya no siguen) y se renuevan las retenciones que pasan de 7 días.
  if (oficio && ord && ruta.sec === "hoy") await repararEstimados(d.id).catch(() => undefined);
  const fC = (["all", "pend", "cur", "done", "no"].includes(sp.f ?? "") ? sp.f : "all") as FiltroCita;
  // Tiendas (4q): el apartado con tallas usa el mismo motor y los mismos bloques que la Tienda de Auto y Hogar.
  const aptOk = oficio || d.cat === "NEG-TIENDA";
  // Mercados y Tiendas (4s): la ayuda con el pedido / la compra usa el mismo motor y bloque que la ayuda con la cita.
  const compra = d.cat === "NEG-MERC" || d.cat === "NEG-TIENDA";
  // 6i · Restaurantes: la ayuda con un evento privado (EP-…) usa el mismo motor y bloque que la ayuda con la cita.
  const citas = (conCitas || compra || food) && ord ? {
    vivas: conCitas && ruta.sec === "hoy" ? await citasVivas(d.id) : undefined,
    // 4e: pre-estimados y presupuestos que esperan su rango (Hoy) y su detalle.
    sol: oficio && ruta.sec === "hoy" ? await solicitudesPanel(d.id) : undefined,
    solDet: oficio && /^sol:[PQ]-/.test(ruta.det ?? "") ? await solicitudPanel(d.id, ruta.det!.slice(4)) : undefined,
    // Emergencias 24/7 abiertas que puede tomar (arriba en Hoy) y el detalle de una.
    em: oficio && ruta.sec === "hoy" ? await emergenciasPanel(d.id) : undefined,
    planes: oficio && ruta.sec === "hoy" ? await planesNegocio(d.id) : undefined,
    // 4f-2: las rentas de herramienta (apartadas, fuera, devueltas con algo pendiente) y el detalle de una.
    rentas: (oficio || d.cat === "NEG-TRANS") && ruta.sec === "hoy" ? await rentasNegocio(d.id) : undefined,
    // 4f-3: apartados de la Tienda (por confirmar, guardados, recogidos hoy) y el detalle de uno.
    apartados: aptOk && ruta.sec === "hoy" ? await apartadosNegocio(d.id) : undefined,
    aptDet: aptOk && ruta.det?.startsWith("apt:") ? await apartadoPanel(d.id, ruta.det.slice(4)) : undefined,
    rentaDet: (oficio || d.cat === "NEG-TRANS") && ruta.det?.startsWith("renta:") ? await rentaPanel(d.id, ruta.det.slice(6)) : undefined,
    emDet: oficio && /^sol:E-/.test(ruta.det ?? "") ? (await emergenciasPanel(d.id, ruta.det!.slice(4)))[0] ?? null : undefined,
    lista: conCitas && ruta.sec === "cli" ? await citasLista(d.id, fC, q, typeof sp.antes === "string" ? sp.antes : null) : undefined, f: fC, q,
    det: conCitas && ruta.det?.startsWith("cita:") ? await citaPanel(d.id, ruta.det.slice(5)) : undefined,
    ayuda: conCitas && ruta.det?.startsWith("cita:") ? await ayudaCitaPanel(d.id, ruta.det.slice(5)) : compra && /^(merc|apt):/.test(ruta.det ?? "") ? await ayudaCitaPanel(d.id, ruta.det!.replace(/^(merc|apt):/, "")) : /^(fiesta|viaje|noche|insc|vis|evp):/.test(ruta.det ?? "") && ruta.det !== "evp:aj" ? await ayudaCitaPanel(d.id, ruta.det!.replace(/^(fiesta|viaje|noche|insc|vis|evp):/, "")) : undefined,
    ayudas: (conCitas || compra || food) && ruta.sec === "hoy" ? await ayudasCitasNegocio(d.id) : undefined,
  } : undefined;
  // Noche (4nc): mesas que esperan, mesas de esta noche, la lista para la puerta y el detalle. Responder pide «Hoy y pedidos».
  const nocOk = d.cat === "NEG-NOCHE" && ord;
  if (ruta.det?.startsWith("noche:") && !nocOk) ruta.det = null;
  const noc = nocOk && (ruta.sec === "hoy" || ruta.det?.startsWith("noche:")) ? await (async () => {
    const N = await import("@/lib/noche-reservas");
    if (ruta.sec === "hoy") await (await import("@/lib/cobros")).repararPagos(d.id).catch(() => undefined);
    return { hoy: ruta.sec === "hoy" ? await N.nocheHoy(d.id) : undefined, det: ruta.det?.startsWith("noche:") ? await N.nochePanel(d.id, ruta.det.slice(6)) : undefined };
  })() : undefined;
  // Inscripciones (4ee): esperan, bajas pedidas, grupos, lista de espera y el detalle (datos del niño solo aquí, auditados). Pide «Hoy y pedidos».
  const insOk = ["NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE"].includes(d.cat) && ord;
  if (ruta.det?.startsWith("insc:") && !insOk) ruta.det = null;
  const ins = insOk && (ruta.sec === "hoy" || ruta.sub === "inscripciones" || ruta.det?.startsWith("insc:")) ? await (async () => {
    const I = await import("@/lib/inscripciones");
    if (ruta.sec === "hoy") await (await import("@/lib/cobros")).repararPagos(d.id).catch(() => undefined);
    return { panel: ruta.sec === "hoy" || ruta.sub === "inscripciones" ? await I.inscPanel(d.id) : undefined, det: ruta.det?.startsWith("insc:") ? await I.inscDetalle(d.id, ruta.det.slice(5), acc.yo.id) : undefined };
  })() : undefined;
  // Visitas y pruebas de manejo (4ie): esperan, hoy, próximas, por propiedad o carro y el detalle (la dirección del cliente de una prueba en
  // casa solo confirmada y auditada). Pide «Hoy y pedidos».
  const visOk = ["NEG-INMUEBLE", "NEG-DEALER"].includes(d.cat) && ord;
  if (ruta.det?.startsWith("vis:") && !visOk) ruta.det = null;
  const vis = visOk && (ruta.sec === "hoy" || ruta.sub === "visitas" || ruta.det?.startsWith("vis:")) ? await (async () => {
    const V = await import("@/lib/visitas-inm");
    return { dl: d.cat === "NEG-DEALER", panel: ruta.sec === "hoy" || ruta.sub === "visitas" ? await V.visPanel(d.id) : undefined, det: ruta.det?.startsWith("vis:") ? await V.visDetalle(d.id, ruta.det.slice(4), acc.yo.id) : undefined };
  })() : undefined;
  // Eventos (6a · DASH-EVENTOS): la lista, los formatos de su categoría, el organizador (verificado / bloqueado) y la ficha o el editor.
  // Pide la parte «evt» del equipo (el dueño siempre).
  const evtOk = d.evtAplica && (acc.partes.includes("all") || acc.partes.includes("evt"));
  if ((ruta.det?.startsWith("evt:") || ruta.det?.startsWith("door:")) && !evtOk) ruta.det = null;
  const evt = evtOk && (ruta.sec === "evt" || ruta.det?.startsWith("evt:") || ruta.det?.startsWith("door:")) ? await (async () => {
    const E = await import("@/lib/evt"), { valores } = await import("@/lib/config");
    // 6f · evt:{evento}@{fecha} = la FECHA QUE ESTÁS VIENDO de una serie (todo lo de la ficha es de esa fecha).
    // 6g · door:{evento}@{fecha} = el modo puerta del panel y el Monitor de esa fecha.
    const [eid = "", fver = null] = ruta.det?.startsWith("evt:") ? ruta.det.slice(4).replace(/^edit:/, "").split("@") : ruta.det?.startsWith("door:") ? ruta.det.slice(5).split("@") : [""];
    const [lista, formatos, generos, org, cfg, fee, b, mod, quien] = await Promise.all([
      E.eventosDelNegocio(d.id), E.formatosDe(d.cat, d.id), E.generos(), E.organizadorDe(d.id), valores("evt_revision_h", "evt_fotos_max", "evt_dias_adelante", "evt_fechas_max", "evt_dias_seguidos_max"),
      db().query<{ bp: number; fixed: number }>(`select rate_bp as bp, fixed_cents as fixed from fee_rules where kind = 'bol' and effective_from <= now() order by effective_from desc, id desc limit 1`),
      db().query<{ dir: string | null }>(`select address as dir from businesses where id = $1`, [d.id]),
      // 6b · El módulo Eventos: si su categoría lo admite, si está encendido y si To'Latino lo pausó (con el motivo).
      db().query<{ aplica: boolean; on: boolean; pausa: string | null }>(
        `select coalesce(c.allowed_modules, '[]'::jsonb) ? 'eventos' as aplica, 'eventos' = any(b.modules_on) as on, b.modules_off->'eventos'->>'reason' as pausa
           from businesses b join categories c on c.id = b.category_id where b.id = $1`, [d.id]),
      // 6b · QUIÉN VA: los RSVP del evento abierto (nombre + inicial; nunca teléfono).
      /^\d+$/.test(eid) ? (await import("@/lib/evt-publico")).ultimosRsvp(eid, 100, d.id) : Promise.resolve([]),
    ]);
    // 6c · Lo vendido del evento abierto, sus códigos y lo vendido de cada evento (barra de la lista). Solo de este negocio.
    const B6 = await import("@/lib/boletos"), C6 = await import("@/lib/codigos-evt");
    const [ventas, codigos, vendidos] = await Promise.all([/^\d+$/.test(eid) ? B6.ventasPanel(d.id, eid, fver) : Promise.resolve(null), /^\d+$/.test(eid) ? C6.codigosDelEvento(d.id, eid) : Promise.resolve([]), B6.vendidosPorEvento(d.id)]);
    // 6d · Después de comprar: cortesías, devoluciones, transferencias, ayuda con órdenes y la lista de espera (sin teléfonos).
    const D6 = await import("@/lib/boletos-despues"), W6 = await import("@/lib/espera");
    const [despues, espera] = /^\d+$/.test(eid) && ventas ? await Promise.all([D6.despuesPanel(d.id, eid), W6.esperaPanel(d.id, eid, fver)]) : [null, null];
    // 6e · Los cambios del evento abierto y su dinero por fecha (solo de este negocio).
    const [cambios, liq] = /^\d+$/.test(eid) ? await Promise.all([(await import("@/lib/evt-cambios")).cambiosPanel(d.id, eid), (await import("@/lib/evt-liquidacion")).liquidacionesPanel(d.id, eid)]) : [null, null];
    // 6f · VENDIDOS (o SE APUNTARON) POR DÍA de la fecha que se ve: una consulta.
    const det6 = /^\d+$/.test(eid) ? await E.eventoPanel(d.id, eid) : null;
    const fv6 = det6 ? (det6.fechas.find((x) => x.id === fver) ?? det6.fechas.find((x) => x.st === "scheduled" && !x.pasada) ?? null)?.id ?? null : null;
    const chart = det6 && fv6 ? await (await import("@/lib/evt-series")).ventasPorDia(d.id, det6.kind === "span" ? det6.fechas.filter((x) => x.st === "scheduled").at(-1)?.id ?? fv6 : fv6) : null;
    // 6g · La puerta: porteros, reglas, la sesión del modo puerta de esta persona y el Monitor de la fecha (la del modo puerta o la que se ve).
    const puerta = det6 ? await (await import("@/lib/puerta-equipo")).puertaPanel(d.id, eid, ruta.det?.startsWith("door:") && fver ? fver : fv6, acc.yo.id, lang === "es") : null;
    return { puerta, cambios, liq, lista, formatos, generos, org, det: det6, fver: fv6, chart, cfg: { revisionH: cfg.evt_revision_h, fotosMax: cfg.evt_fotos_max, diasAdelante: cfg.evt_dias_adelante, fechasMax: cfg.evt_fechas_max, diasMax: cfg.evt_dias_seguidos_max },
      fee: fee.rows[0] ?? null, hoy: d.hoy.fecha, dir: b.rows[0]?.dir ?? null, mod: mod.rows[0] ?? { aplica: false, on: false, pausa: null }, quien, ventas, codigos, vendidos, despues, espera };
  })() : undefined;
  // 6i · Evento privado (restaurantes): las solicitudes en Hoy y su detalle piden «Hoy y pedidos»; los ajustes (Reservaciones › Evento privado),
  // «Lo que vendes». Solo de este negocio (evpPanel filtra por negocio).
  if (ruta.det?.startsWith("evp:") && !(food && (ruta.det === "evp:aj" ? catOk : ord))) ruta.det = null;
  const evp = food ? await (async () => {
    const E = await import("@/lib/evento-privado"), { valores } = await import("@/lib/config"), { tarjetaDe } = await import("@/lib/cobros");
    const ajOn = catOk && ((ruta.sec === "mod" && ruta.sub === "reservaciones") || ruta.det === "evp:aj");
    return {
      hoy: ruta.sec === "hoy" && ord ? await E.evpHoy(d.id) : undefined,
      det: ord && ruta.det?.startsWith("evp:EP-") ? await E.evpPanel(d.id, ruta.det.slice(4)) : undefined,
      aj: ajOn ? { ...(await E.ajustesEvp(d.id)), min: (await valores("evp_anticipacion_dias")).evp_anticipacion_dias, tarjeta: !!(await tarjetaDe(d.id)).cuenta } : undefined,
    };
  })() : undefined;
  // 7e · Panel › El Compa (cualquier miembro activo): lo que la sección necesita para empezar, SOLO aquí y a prueba de fallas (si falla, la
  // sección dice que El Compa no está y lleva a Ayuda y Soporte; ninguna otra pantalla del panel espera a El Compa).
  const cpa = ruta.sec === "cpa" ? await (await import("@/lib/compa/asistente-panel")).asistentePanel(acc.yo.id, d.id, lang).catch(() => null) : undefined;
  const cpaAuto = ruta.sec === "cpa" && RA ? await RA.ajustesAuto(d.id, acc.partes).catch(() => null) : undefined;
  return <Panel cpa={cpa} cpaAuto={cpaAuto} d={d} lang={lang} ruta={ruta} modoPruebas={process.env.TOLATINO_ENTORNO !== "produccion"} menu={menu} ped={ped} rsv={rsv} res={res} nov={nov} cup={cup} jobs={jobs} cob={cob} reps={reps} plan={plan} msj={msj} svc={svc} citas={citas} ofi={ofi} ret={ret} mped={mped} fies={fies} via={via} noc={noc} ins={ins} vis={vis} evt={evt} evp={evp} />;
}
