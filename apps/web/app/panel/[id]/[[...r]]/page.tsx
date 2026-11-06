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
import { itemsNovedad, novedadPanel, novedadesPanel } from "@/lib/novedades";
import type { NovData } from "../../NovedadesPanel";
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
const SUBS = new Set(["hor", "fotos", "about", "equipo", "ver", "lic", "resenas", "nov"]);
const DET = /^(stf:(new|[0-9a-f-]{36})|(item|mcat|mgrp):(new|\d{1,18})|ped:\d{1,12}|rsv:R-\d{1,10}|rev:\d{1,18}|nov:(new|(edit|dup):\d{1,18}|\d{1,18})|vac:(new|(edit|dup):\d{1,18}|\d{1,18})|vap:\d{1,18}|msg:\d{1,18}|svc:(new|new:extra|\d{1,18})|svm|of:(new|new:\d{1,18}|\d{1,18})|cita:C-\d{1,10}|sol:[PQE]-\d{1,10}|renta:T-\d{1,10}|apt:A-\d{1,10})$/;
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
  else if (r.length === 1 && r[0] === "cobros") ruta = { sec: "pay", sub: null, det: null };
  else if (r.length === 2 && r[0] === "cobros" && r[1] === "plan") ruta = { sec: "pay", sub: "plan", det: null };
  else if (r.length === 2 && r[0] === "vendes" && (r[1] === "menu" || r[1] === "pedidos" || r[1] === "reservaciones" || r[1] === "jobs" || r[1] === "servicios" || r[1] === "citas" || r[1] === "sillas" || r[1] === "herramienta")) ruta = { sec: "mod", sub: r[1], det: null };
  else notFound();
  if (typeof sp.det === "string" && DET.test(sp.det)) ruta.det = sp.det;
  const acc = await accesoPanel(id, ruta.sec === "hoy" || ruta.sec === "cli" ? "ord" : ruta.sec === "msg" ? "msg" : ruta.sec === "mod" ? "cat" : ruta.sec === "dlv" ? "dlv" : ruta.sec === "pay" ? "pay" : ruta.sec === "mas" ? undefined : "page");
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
  // Sin cobros con tarjeta (no es comida): Cobros y plan abre directo «Tu plan».
  if (ruta.sec === "pay" && !ruta.sub && d.cat !== "NEG-FOOD") ruta.sub = "plan";
  // Lo que vendes · Menú (Comida): el menú del negocio, calculado en el servidor.
  const menu = ruta.sec === "mod" && d.cat === "NEG-FOOD" ? await menuPanel(d.id) : undefined;
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
  };
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
  const cob = ruta.sec === "pay" && ruta.sub !== "plan" ? await cobrosPanel(d.id) : undefined;
  // Tu plan (Cobros y plan): el estado del plan, los recibos y las tarjetas guardadas del dueño.
  const plan = ruta.sec === "pay" && ruta.sub === "plan" ? await (async () => {
    const S = await import("@/lib/suscripcion"), { pasarela } = await import("@/lib/pagos/pasarela"), { misTarjetas } = await import("@/lib/cobros");
    return { plan: await S.planDe(d.id), recibos: await S.recibosPro(d.id), modo: pasarela.modo(), pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(acc.yo.id) };
  })() : undefined;
  // Repartidores: Entrega (Tus repartidores, cuadre) y el detalle de un pedido de delivery (despacho).
  const reps = food && (ruta.sec === "dlv" || ruta.det?.startsWith("ped:")) ? await repartidoresDe(d.id) : undefined;
  // Mensajes (2p): la lista, la conversación (marca leído) y «Mensajes sin responder» en Hoy. Piden acceso a Mensajes.
  const vMsg = acc.partes.includes("all") || acc.partes.includes("msg");
  if (ruta.det?.startsWith("msg:") && !vMsg) ruta.det = null;
  const msj: MsjPanel = {
    lista: ruta.sec === "msg" && vMsg ? await hilosNegocio(d.id, "todas", typeof sp.antes === "string" ? sp.antes : null) : undefined,
    det: ruta.det?.startsWith("msg:") ? await conversacionNegocio(d.id, ruta.det.slice(4)) : undefined,
    hoy: ruta.sec === "hoy" && vMsg ? (await hilosNegocio(d.id, "sin")).hilos.slice(0, 5) : undefined,
    n: vMsg ? (await db().query<{ n: number }>(`select count(*)::int as n from chat_threads where business_id = $1 and biz_unread > 0`, [d.id])).rows[0]?.n ?? 0 : 0,
  };
  // Servicios y citas (Fase 3): Lo que vendes de un negocio de citas (servicios, reglas, sillas) y el editor.
  const conCitas = d.mods.some((m) => m === "svc" || m === "citas") || d.cat === "NEG-BELL";
  // Auto y Hogar (Fase 4): sus servicios con forma de cobrar y Tu herramienta, en vez de los de Belleza.
  const oficio = !!rubroDe(d.cat), catOk = acc.partes.includes("all") || acc.partes.includes("cat");
  const svc = conCitas && !oficio && (ruta.sec === "mod" || ruta.det?.startsWith("svc:") || ruta.det === "svm") && catOk ? await serviciosPanel(d.id) : undefined;
  const ofi = oficio && (ruta.sec === "mod" || ruta.det?.startsWith("of:")) && catOk ? (await oficiosPanel(d.id, d.cat)) ?? undefined : undefined;
  if (ruta.det?.startsWith("of:") && !ofi) ruta.det = null;
  // Mercados y Tiendas (4n): Tu herramienta (Balanza y pedidos / Tallas y apartados).
  const ret = rubroRetail(d.cat) && ruta.sec === "mod" && catOk ? (await herramientaRetail(d.id)) ?? undefined : undefined;
  // Citas (Belleza): las vivas para Hoy, Clientes › Citas y el detalle. Responder pide «Hoy y pedidos».
  if (ruta.det?.startsWith("cita:") && !(conCitas && ord)) ruta.det = null;
  // Auto y Hogar (4d): al mirar Hoy se reintenta lo que quedó a medias (cobros de una liquidación, retenciones de citas
  // que ya no siguen) y se renuevan las retenciones que pasan de 7 días.
  if (oficio && ord && ruta.sec === "hoy") await repararEstimados(d.id).catch(() => undefined);
  const fC = (["all", "pend", "cur", "done", "no"].includes(sp.f ?? "") ? sp.f : "all") as FiltroCita;
  const citas = conCitas && ord ? {
    vivas: ruta.sec === "hoy" ? await citasVivas(d.id) : undefined,
    // 4e: pre-estimados y presupuestos que esperan su rango (Hoy) y su detalle.
    sol: oficio && ruta.sec === "hoy" ? await solicitudesPanel(d.id) : undefined,
    solDet: oficio && /^sol:[PQ]-/.test(ruta.det ?? "") ? await solicitudPanel(d.id, ruta.det!.slice(4)) : undefined,
    // Emergencias 24/7 abiertas que puede tomar (arriba en Hoy) y el detalle de una.
    em: oficio && ruta.sec === "hoy" ? await emergenciasPanel(d.id) : undefined,
    planes: oficio && ruta.sec === "hoy" ? await planesNegocio(d.id) : undefined,
    // 4f-2: las rentas de herramienta (apartadas, fuera, devueltas con algo pendiente) y el detalle de una.
    rentas: oficio && ruta.sec === "hoy" ? await rentasNegocio(d.id) : undefined,
    // 4f-3: apartados de la Tienda (por confirmar, guardados, recogidos hoy) y el detalle de uno.
    apartados: oficio && ruta.sec === "hoy" ? await apartadosNegocio(d.id) : undefined,
    aptDet: oficio && ruta.det?.startsWith("apt:") ? await apartadoPanel(d.id, ruta.det.slice(4)) : undefined,
    rentaDet: oficio && ruta.det?.startsWith("renta:") ? await rentaPanel(d.id, ruta.det.slice(6)) : undefined,
    emDet: oficio && /^sol:E-/.test(ruta.det ?? "") ? (await emergenciasPanel(d.id, ruta.det!.slice(4)))[0] ?? null : undefined,
    lista: ruta.sec === "cli" ? await citasLista(d.id, fC, q, typeof sp.antes === "string" ? sp.antes : null) : undefined, f: fC, q,
    det: ruta.det?.startsWith("cita:") ? await citaPanel(d.id, ruta.det.slice(5)) : undefined,
    ayuda: ruta.det?.startsWith("cita:") ? await ayudaCitaPanel(d.id, ruta.det.slice(5)) : undefined,
    ayudas: ruta.sec === "hoy" ? await ayudasCitasNegocio(d.id) : undefined,
  } : undefined;
  return <Panel d={d} lang={lang} ruta={ruta} modoPruebas={process.env.TOLATINO_ENTORNO !== "produccion"} menu={menu} ped={ped} rsv={rsv} res={res} nov={nov} jobs={jobs} cob={cob} reps={reps} plan={plan} msj={msj} svc={svc} citas={citas} ofi={ofi} ret={ret} />;
}
