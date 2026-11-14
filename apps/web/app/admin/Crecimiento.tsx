"use client";
/* 9h · Super Admin › Crecimiento (ADM-MKT; prototipo del Super Admin secMkt — hueco #2 de fase9-apertura.md: se porta con los bloques del admin): cifras de
   arriba, pestañas Semilla · Promotores · Campañas · Destacados · Enlaces y QR (crear, PDF para imprimir, escaneos por día y por enlace, retirar) y Lista de
   espera (por ciudad, código postal, negocios apartados por tipo, «Pide tu ciudad», la fecha de la landing oculta o visible). Todo cambio con motivo
   (ConfirmarMotivo, patrón 2ao) y auditoría; el servidor decide (lib/crecimiento). La lista nunca muestra teléfonos ni nombres. En los dos idiomas del admin. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EntradaLista } from "@/lib/crecimiento/admin";
import type { CampanaAdm } from "@/lib/crecimiento/campanas";
import { CANAL, CANALES, MODO, TIPO_CAMPANA, TIPO_ENLACE, TIPOS_CAMPANA, TIPOS_ENLACE, type Canal, type Modo, type Segmento, type TipoCampana, type TipoEnlace } from "@/lib/crecimiento/comun";
import type { DestacadoAdm } from "@/lib/crecimiento/destacados";
import type { EnlaceAdm } from "@/lib/crecimiento/enlaces";
import type { PromotorAdm } from "@/lib/crecimiento/promotores";
import { campanaAprobar, campanaContar, campanaCrear, campanaRetirar, codigoRetirar, destacadoBuscar, destacadoFijar, destacadoRetirar, enlaceCrear, enlaceEscaneos, enlaceRetirar, landingFecha, promotorNombrar } from "./acciones-crecimiento";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export type Pest = "seed" | "promo" | "camp" | "feat" | "links" | "lista";
type Kpi = { negocios: number; semana: number; espera: number; apartados: number; promotores: number; fijados: number; escaneos: number };
export type DatosCrec = {
  t: Pest; ciudad: string | null; ciudadForm: string; ciudades: { id: string; name: string; status: string }[]; kpi: Kpi;
  puede: { editar: boolean; aprobar: boolean; todas: boolean }; ver: string | null;
  seed: { recs: { id: string; nombre: string; cat: string | null; donde: string | null; at: string }[]; seeds: { id: string; nombre: string; cat: string | null; estado: string; at: string }[]; sinOferta: { q: string; cat: string | null; n: number }[] } | null;
  promo: PromotorAdm[] | null;
  camp: { filas: CampanaAdm[]; mas: string | null } | null;
  feat: { lista: DestacadoAdm[]; hoy: { id: string; nombre: string; abierto: boolean }[]; tope: number; dias: number; fijados: number } | null;
  links: { filas: EnlaceAdm[]; mas: string | null } | null;
  lista: { porCiudad: { city: string; nombre: string; status: string; n: number; neg: number; fv: number }[]; porModo: { modo: Modo | null; n: number }[]; porZip: { zip: string; n: number }[];
    fuera: { pedida: string; n: number }[]; filas: EntradaLista[]; mas: string | null; fecha: { visible: boolean; fecha: string | null } } | null;
};
const CATS: [string, string, string][] = [["NEG-FOOD", "Comida", "Food"], ["NEG-BELL", "Belleza", "Beauty"], ["NEG-AUTO", "Auto", "Auto"], ["NEG-HOGAR", "Hogar", "Home"], ["NEG-NOCHE", "Noche", "Nightlife"],
  ["NEG-MERC", "Mercados", "Markets"], ["NEG-FIESTA", "Fiestas", "Parties"], ["NEG-SALUD", "Doctores", "Doctors"], ["NEG-PRO", "Profesionales", "Professionals"], ["NEG-TIENDA", "Tiendas", "Shops"],
  ["NEG-TRANS", "Transporte", "Transport"], ["NEG-EDU", "Educación", "Education"], ["NEG-NINOS", "Niños", "Kids"], ["NEG-DEPORTE", "Deporte", "Sports"], ["NEG-FE", "Iglesias", "Churches"],
  ["NEG-INMUEBLE", "Bienes raíces", "Real estate"], ["NEG-DEALER", "Venta de autos", "Car dealers"]];
const DESTINOS: [string, string, string][] = [["/acceso", "La landing", "The landing"], ["/publica", "Publica tu negocio", "List your business"], ["/", "El Inicio", "The Home"], ["/eventos", "Eventos", "Events"]];

export function Crecimiento({ d, l }: { d: DatosCrec; l: L }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (q: Record<string, string | null>) => {
    const u = new URLSearchParams(); const base = { t: d.t, c: d.ciudad, ...q };
    for (const [k, v] of Object.entries(base)) if (v) u.set(k, v);
    router.push(`/admin/crecimiento?${u}`);
  };
  const nombreCiudad = (id: string | null) => d.ciudades.find((c) => c.id === id)?.name ?? id ?? "";

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("DINERO Y CRECIMIENTO · CRECIMIENTO", "MONEY & GROWTH · GROWTH"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const k = d.kpi;
  const cab: Bloque[] = [
    { type: "head", eye: E("DINERO Y CRECIMIENTO", "MONEY & GROWTH"), t: E("Crecimiento", "Growth"), h1: desk ? 26 : 22,
      s: E("Cómo entran negocios y vecinos: semilla desde recomendaciones de vecinos, promotores, campañas, destacados, enlaces y QR, y la lista de la landing.", "How businesses and neighbors come in: seed from neighbor recommendations, promoters, campaigns, featured, links and QR, and the landing list.") },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("NEGOCIOS", "BUSINESSES"), v: String(k.negocios), s: E(`+${k.semana} esta semana`, `+${k.semana} this week`), bg: "var(--tl-ink)", fg: "var(--tl-white)", bd: "none" },
      { k: E("LISTA DE ESPERA", "WAITLIST"), v: String(k.espera), s: E(`${k.apartados} negocios apartados`, `${k.apartados} businesses held`), onClick: () => ir({ t: "lista", desde: null }) },
      { k: E("PROMOTORES", "PROMOTERS"), v: String(k.promotores), s: E("con código vivo", "with a live code"), onClick: () => ir({ t: "promo", desde: null }) },
      { k: E("ESCANEOS · 30 D", "SCANS · 30 D"), v: String(k.escaneos), s: E(`${k.fijados} destacados fijados`, `${k.fijados} featured pinned`), onClick: () => ir({ t: "links", desde: null }) },
    ] },
    { type: "tabs", items: ([["seed", E("Semilla", "Seed")], ["promo", E("Promotores", "Promoters")], ["camp", E("Campañas", "Campaigns")], ["feat", E("Destacados", "Featured")], ["links", E("Enlaces y QR", "Links & QR")], ["lista", E("Lista de espera", "Waitlist")]] as [Pest, string][])
      .map(([key, lbl]) => ({ l: lbl, on: d.t === key, onClick: () => ir({ t: key, desde: null, ver: null }) })) },
    selectorIdioma(l, router),
    { type: "chips", k: E("CIUDAD", "CITY"), items: [...(d.t === "feat" ? [] : [{ l: E("Todas", "All"), v: d.ciudad ? "filter" : "selected", onClick: () => ir({ c: null, desde: null }) }]),
      ...d.ciudades.map((c) => ({ l: `${c.name}${c.status === "on" ? "" : ` · ${E("pronto", "soon")}`}`, v: (d.ciudad ?? (d.t === "feat" ? d.ciudadForm : null)) === c.id ? "selected" : "filter", onClick: () => ir({ c: c.id, desde: null }) }))] },
  ];
  let cuerpo: ReactNode = null;
  if (d.t === "seed" && d.seed) cuerpo = <Semilla d={d} E={E} cuando={cuando} router={router} />;
  if (d.t === "promo" && d.promo) cuerpo = <Promotores d={d} E={E} setConf={setConf} nombreCiudad={nombreCiudad} />;
  if (d.t === "camp" && d.camp) cuerpo = <Campanas d={d} E={E} cuando={cuando} setConf={setConf} ir={ir} nombreCiudad={nombreCiudad} l={l} />;
  if (d.t === "feat" && d.feat) cuerpo = <Destacados d={d} E={E} cuando={cuando} setConf={setConf} />;
  if (d.t === "links" && d.links) cuerpo = <Enlaces d={d} E={E} cuando={cuando} setConf={setConf} ir={ir} setToast={setToast} nombreCiudad={nombreCiudad} l={l} />;
  if (d.t === "lista" && d.lista) cuerpo = <Lista d={d} E={E} cuando={cuando} setConf={setConf} ir={ir} l={l} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-crecimiento={d.t}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}

type EFn = (a: string, b: string) => string;
type Router = ReturnType<typeof useRouter>;
type SetConf = (c: Confirmar | null) => void;

function Semilla({ d, E, cuando, router }: { d: DatosCrec; E: EFn; cuando: (iso: string | null) => string; router: Router }) {
  const s = d.seed!;
  return <PanelBloques bloques={[
    { type: "note", tone: "ink", icon: "store", t: E("Semilla = negocio «no reclamado» con nombre, categoría y zona; el dueño lo reclama desde Publica tu negocio. Sale en la categoría con la etiqueta SIN RECLAMAR y solo con Llamar.", "Seed = “unclaimed” business with name, category and area; the owner claims it from List your business. Shows in the category tagged UNCLAIMED with Call only.") },
    s.recs.length ? { type: "rows", k: `${E("RECOMENDADOS POR VECINOS", "RECOMMENDED BY NEIGHBORS")} · ${s.recs.length}`, link: E("Ir a la cola", "Go to the queue"), onLink: () => router.push("/admin/colas"),
      items: s.recs.map((r) => ({ key: r.id, icon: "like", t: r.nombre, s: [r.cat, r.donde === "sin_local" ? E("sin local", "no venue") : null].filter(Boolean).join(" · "), m: cuando(r.at).toUpperCase(), onClick: () => router.push("/admin/colas"), chev: true })) }
      : { type: "empty", icon: "like", t: E("Sin recomendaciones nuevas", "No new recommendations"), s: E("Cuando un vecino recomienda un negocio que no está, sale aquí y en Colas.", "When a neighbor recommends a business that isn’t listed, it shows here and in Queues.") },
    { type: "rows", k: E("BÚSQUEDAS SIN OFERTA · A RECLUTAR", "SEARCHES WITHOUT SUPPLY · TO RECRUIT"), link: E("Ver todas", "See all"), onLink: () => router.push("/admin/catalogo"),
      items: s.sinOferta.length ? s.sinOferta.map((x, i) => ({ key: String(i), icon: "search", t: x.q, s: `${x.cat ? `${x.cat} · ` : ""}${x.n} ${E("vecinos esperan", "neighbors waiting")}` })) : [{ t: E("Nadie pidió algo que no haya.", "Nobody asked for something missing."), icon: "search" }] },
    ...(s.seeds.length ? [{ type: "rows" as const, k: E("SEMILLAS CREADAS", "SEEDS CREATED"), items: s.seeds.map((x) => ({ key: x.id, icon: "store", t: x.nombre, s: `${x.cat ?? ""} · ${cuando(x.at)}`,
      tag: x.estado === "claimed" ? E("RECLAMADA", "CLAIMED") : x.estado === "removed" ? E("QUITADA", "REMOVED") : E("SIN RECLAMAR", "UNCLAIMED"), tone: x.estado === "claimed" ? "signal" : "neutral" })) }] : []),
  ]} />;
}

function Promotores({ d, E, setConf, nombreCiudad }: { d: DatosCrec; E: EFn; setConf: SetConf; nombreCiudad: (id: string | null) => string }) {
  const [tel, setTel] = useState(""), [ciu, setCiu] = useState(d.ciudadForm), ref = useRef({ tel, ciu }); ref.current = { tel, ciu };
  const P = d.promo!;
  const fila = (p: PromotorAdm): Fila => ({ key: p.code, icon: p.kind === "promotor" ? "users" : "bolt", t: p.kind === "promotor" ? `${p.nombre ?? "—"} · ${p.code}` : `${p.code} · ${E("campaña", "campaign")}`,
    s: `${p.ciudad ? nombreCiudad(p.ciudad) : E("todas las ciudades", "all cities")} · ${p.dias} ${E("días de prueba", "trial days")} · ${p.traidos} ${E("negocios traídos", "businesses brought")} · ${p.calificados} ${E("calificados", "qualified")}${p.rechazados ? ` · ${p.rechazados} ${E("rechazados (auto-referido)", "rejected (self-referral)")}` : ""}${p.pendienteCents ? ` · $${(p.pendienteCents / 100).toFixed(2)} ${E("pendiente de pago (llega con el dinero real, 9k)", "pending payout (comes with real money, 9k)")}` : ""}`,
    tag: p.vivo ? E("VIVO", "LIVE") : E("RETIRADO", "RETIRED"), tone: p.vivo ? "signal" : "neutral", dim: !p.vivo,
    acts: d.puede.editar && p.vivo ? [{ l: E("Retirar", "Retire"), v: "secondary", onClick: () => setConf({ titulo: E(`Retirar el código ${p.code}`, `Retire code ${p.code}`), cta: E("Retirar", "Retire"), peligro: true,
      sub: E("Ya no da días de prueba. Lo que trajo queda en el historial.", "It no longer gives trial days. What it brought stays in the history."), plantillas: [E("Terminó la campaña.", "Campaign ended."), E("Uso indebido.", "Misuse.")], hacer: (m) => codigoRetirar(p.code, m) }) }] : undefined });
  return <PanelBloques bloques={[
    { type: "note", tone: "info", icon: "users", t: E("Promotor = vecino que trae negocios. Su negocio traído recibe más días de prueba Pro; cuando llega a los pedidos o citas de Configuración, el promotor califica para su recompensa (el pago a la Wallet llega con el dinero real, 9k). Su propio negocio o uno de su mismo teléfono no cuenta.", "Promoter = neighbor who brings businesses. The business they bring gets more Pro trial days; when it reaches the orders or bookings set in Configuration, the promoter qualifies for the reward (the Wallet payout comes with real money, 9k). Their own business or one from the same phone does not count.") },
    P.length ? { type: "rows", k: `${E("CÓDIGOS", "CODES")} · ${P.length}`, items: P.map(fila) } : { type: "empty", icon: "users", t: E("Sin códigos", "No codes"), s: E("Nombra al primer promotor abajo.", "Name the first promoter below.") },
    ...(d.puede.editar ? [
      { type: "group" as const, k: E("NOMBRAR PROMOTOR", "NAME A PROMOTER") },
      { type: "field" as const, k: E("SU TELÉFONO (TIENE CUENTA EN TO'LATINO)", "THEIR PHONE (HAS A TO'LATINO ACCOUNT)"), val: tel, onChange: (v: string) => setTel(v.replace(/\D/g, "").slice(0, 10)), ph: "5705550134", im: "numeric", max: 10 },
      { type: "chips" as const, k: E("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: c.name, v: ciu === c.id ? "selected" : "filter", onClick: () => setCiu(c.id) })) },
      { type: "acts" as const, items: [{ l: E("Nombrar promotor", "Name promoter"), v: "action", icon: "plus", off: tel.length !== 10, onClick: () => setConf({ titulo: E("Nombrar promotor", "Name a promoter"), cta: E("Nombrar", "Name"),
        sub: E("Le creamos su código y le llega un aviso con él. Queda en la auditoría.", "We create their code and they get a notice with it. It goes in the audit trail."), plantillas: [E("Vecino que conoce negocios del barrio.", "Neighbor who knows local businesses."), E("Líder de iglesia.", "Church leader.")],
        hacer: (m) => promotorNombrar(ref.current.tel, ref.current.ciu, m) }) }] },
    ] : []),
  ]} />;
}

const ESTADO_C: Record<string, [string, string, string]> = { borrador: ["BORRADOR", "DRAFT", "neutral"], por_aprobar: ["POR APROBAR", "NEEDS APPROVAL", "pro"], programada: ["PROGRAMADA", "SCHEDULED", "action"],
  enviando: ["SALIENDO", "SENDING", "action"], enviada: ["ENVIADA", "SENT", "signal"], retirada: ["RETIRADA", "RETIRED", "neutral"] };
function Campanas({ d, E, cuando, setConf, ir, nombreCiudad, l }: { d: DatosCrec; E: EFn; cuando: (iso: string | null) => string; setConf: SetConf; ir: (q: Record<string, string | null>) => void; nombreCiudad: (id: string | null) => string; l: L }) {
  const C = d.camp!;
  const [f, setF] = useState({ nombre: "", tipo: "reclutamiento" as TipoCampana, canal: "inapp" as Canal, ciudad: d.ciudadForm, rol: "vecinos" as Segmento["rol"], inactivos: 0, cat: "", plan: "", tituloEs: "", tituloEn: "", textoEs: "", textoEn: "", href: "", cuando: "" });
  const [n, setN] = useState<number | null>(null), ref = useRef(f); ref.current = f;
  const set = (x: Partial<typeof f>) => setF((v) => ({ ...v, ...x }));
  const seg = (): Segmento => ({ rol: f.rol, inactivos: f.inactivos || null, cat: f.rol === "negocios" && f.cat ? f.cat : null, plan: f.rol === "negocios" && (f.plan === "free" || f.plan === "pro") ? f.plan : null });
  const segKey = JSON.stringify([f.ciudad, seg()]);
  useEffect(() => { let vivo = true; void campanaContar(f.ciudad, JSON.parse(segKey)[1]).then((x) => { if (vivo) setN(x); }); return () => { vivo = false; }; }, [segKey, f.ciudad]);
  const resumenSeg = (s: Segmento) => [s.rol === "negocios" ? E("dueños de negocios", "business owners") : E("vecinos", "neighbors"), s.inactivos ? E(`inactivos ${s.inactivos}+ días`, `inactive ${s.inactivos}+ days`) : null,
    s.cat ? (CATS.find((c) => c[0] === s.cat)?.[l === "es" ? 1 : 2] ?? s.cat) : null, s.plan ? s.plan.toUpperCase() : null].filter(Boolean).join(" · ");
  const fila = (x: CampanaAdm): Fila => {
    const st = ESTADO_C[x.estado] ?? [x.estado, x.estado, "neutral"], acts: Fila["acts"] = [];
    if (x.estado === "por_aprobar" && d.puede.aprobar && !x.creadaPorMi) acts.push({ l: E("Aprobar", "Approve"), v: "action", onClick: () => setConf({ titulo: E(`Aprobar «${x.nombre}»`, `Approve “${x.nombre}”`), cta: E("Aprobar", "Approve"),
      sub: E(`Llega a ${x.personas ?? 0} personas. La aprueba otra persona del equipo; queda en la auditoría.`, `It reaches ${x.personas ?? 0} people. Another team member approves it; it goes in the audit trail.`), plantillas: [E("Revisé el texto y el segmento.", "I checked the text and the segment.")], hacer: (m) => campanaAprobar(x.id, m) }) });
    if (d.puede.editar && ["borrador", "por_aprobar", "programada", "enviando"].includes(x.estado)) acts.push({ l: E("Retirar", "Retire"), v: "secondary", onClick: () => setConf({ titulo: E(`Retirar «${x.nombre}»`, `Retire “${x.nombre}”`), cta: E("Retirar", "Retire"), peligro: true,
      sub: E("No sale más. Lo que ya salió queda en el historial.", "Nothing more goes out. What already went out stays in the history."), plantillas: [E("Tenía un error.", "It had an error."), E("Ya no aplica.", "No longer applies.")], hacer: (m) => campanaRetirar(x.id, m) }) });
    return { key: x.id, icon: x.canal === "sms" ? "phone" : x.canal === "correo" ? "news" : "bell", t: `${x.nombre} · ${nombreCiudad(x.city)}`, tag: E(st[0], st[1]), tone: st[2],
      s: `${E(TIPO_CAMPANA[x.tipo as TipoCampana]?.es ?? x.tipo, TIPO_CAMPANA[x.tipo as TipoCampana]?.en ?? x.tipo)} · ${E(CANAL[x.canal].es, CANAL[x.canal].en)} · ${resumenSeg(x.seg)} · «${l === "es" ? x.titulo.es : x.titulo.en}»`,
      m: `${E("SALE", "GOES OUT")} ${cuando(x.cuando).toUpperCase()} · ${x.personas ?? 0} ${E("PERSONAS", "PEOPLE")} · ${x.enviados} ${E("ENVIADOS", "SENT")} · ${x.tope} ${E("EN TOPE", "AT LIMIT")}${x.canal === "correo" ? ` · ${x.sinCorreo} ${E("SIN CORREO", "NO EMAIL")}` : ""} · ${x.abiertos} ${E("ABIERTOS", "OPENED")}${x.creadaPorMi ? ` · ${E("TUYA", "YOURS")}` : x.quien ? ` · ${x.quien.toUpperCase()}` : ""}${x.aprobo ? ` · ${E("APROBÓ", "APPROVED BY")} ${x.aprobo.toUpperCase()}` : ""}${x.razon ? ` · ${x.razon}` : ""}`,
      acts: acts.length ? acts : undefined, dim: x.estado === "retirada" };
  };
  const sms = f.canal === "sms", maxT = sms ? 150 : 300;
  const listo = f.nombre.trim().length >= 3 && f.tituloEs.trim().length >= 2 && f.tituloEn.trim().length >= 2 && f.textoEs.trim().length >= 3 && f.textoEn.trim().length >= 3;
  return <PanelBloques bloques={[
    { type: "note", tone: "info", icon: "bell", t: E("Solo llegan a quien encendió «Novedades de To'Latino» en Mi cuenta › Avisos (apagado de fábrica), nunca de 10 PM a 7 AM y con tope por persona y semana (y para SMS, por mes). A más de las personas de Configuración, la aprueba otra persona del equipo.", "They only reach people who turned on “To'Latino updates” in My account › Notifications (off by default), never from 10 PM to 7 AM, with a limit per person per week (and for SMS, per month). Above the number in Configuration, another team member approves it.") },
    C.filas.length ? { type: "rows", k: `${E("CAMPAÑAS", "CAMPAIGNS")} · ${C.filas.length}${C.mas ? "+" : ""}`, items: C.filas.map(fila) } : { type: "empty", icon: "bell", t: E("Sin campañas", "No campaigns"), s: E("Crea la primera abajo.", "Create the first one below.") },
    ...(C.mas ? [{ type: "acts" as const, items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir({ desde: C.mas }) }] }] : []),
    ...(d.puede.editar ? [
      { type: "group" as const, k: E("NUEVA CAMPAÑA", "NEW CAMPAIGN") },
      { type: "field" as const, k: E("NOMBRE (LO VE SOLO EL EQUIPO)", "NAME (ONLY THE TEAM SEES IT)"), val: f.nombre, onChange: (v: string) => set({ nombre: v }), max: 80 },
      { type: "chips" as const, k: E("TIPO", "TYPE"), items: TIPOS_CAMPANA.map((t) => ({ l: E(TIPO_CAMPANA[t].es, TIPO_CAMPANA[t].en), v: f.tipo === t ? "selected" : "filter", onClick: () => set({ tipo: t }) })) },
      { type: "chips" as const, k: E("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: c.name, v: f.ciudad === c.id ? "selected" : "filter", onClick: () => set({ ciudad: c.id }) })) },
      { type: "chips" as const, k: E("A QUIÉN", "WHO"), items: [{ l: E("Vecinos", "Neighbors"), v: f.rol === "vecinos" ? "selected" : "filter", onClick: () => set({ rol: "vecinos" }) }, { l: E("Dueños de negocios", "Business owners"), v: f.rol === "negocios" ? "selected" : "filter", onClick: () => set({ rol: "negocios" }) }] },
      { type: "chips" as const, k: E("SIN ENTRAR DESDE", "INACTIVE FOR"), items: [0, 30, 60, 90].map((x) => ({ l: x ? E(`${x}+ días`, `${x}+ days`) : E("Todos", "Everyone"), v: f.inactivos === x ? "selected" : "filter", onClick: () => set({ inactivos: x }) })) },
      ...(f.rol === "negocios" ? [
        { type: "chips" as const, k: E("CATEGORÍA", "CATEGORY"), items: [{ l: E("Todas", "All"), v: f.cat ? "filter" : "selected", onClick: () => set({ cat: "" }) }, ...CATS.map((c) => ({ l: l === "es" ? c[1] : c[2], v: f.cat === c[0] ? "selected" : "filter", onClick: () => set({ cat: c[0] }) }))] },
        { type: "chips" as const, k: E("PLAN", "PLAN"), items: [["", E("Todos", "All")], ["free", "Free"], ["pro", "Pro"]].map(([v, lb]) => ({ l: lb!, v: f.plan === v ? "selected" : "filter", onClick: () => set({ plan: v! }) })) },
      ] : []),
      { type: "note" as const, tone: "ok" as const, icon: "users", t: n === null ? E("Contando…", "Counting…") : E(`Llega a ${n} ${n === 1 ? "persona" : "personas"} que encendieron Novedades.`, `It reaches ${n} ${n === 1 ? "person" : "people"} who turned on Updates.`) },
      { type: "chips" as const, k: E("CANAL", "CHANNEL"), items: CANALES.map((c) => ({ l: E(CANAL[c].es, CANAL[c].en), v: f.canal === c ? "selected" : "filter", onClick: () => set({ canal: c }) })) },
      { type: "field" as const, k: E("TÍTULO EN ESPAÑOL", "TITLE IN SPANISH"), val: f.tituloEs, onChange: (v: string) => set({ tituloEs: v }), max: 60, count: `${f.tituloEs.length}/60` },
      { type: "field" as const, k: E("TÍTULO EN INGLÉS", "TITLE IN ENGLISH"), val: f.tituloEn, onChange: (v: string) => set({ tituloEn: v }), max: 60, count: `${f.tituloEn.length}/60` },
      { type: "field" as const, k: E("TEXTO EN ESPAÑOL", "TEXT IN SPANISH"), val: f.textoEs, onChange: (v: string) => set({ textoEs: v }), area: true, rows: 3, max: maxT, count: `${f.textoEs.length}/${maxT}` },
      { type: "field" as const, k: E("TEXTO EN INGLÉS", "TEXT IN ENGLISH"), val: f.textoEn, onChange: (v: string) => set({ textoEn: v }), area: true, rows: 3, max: maxT, count: `${f.textoEn.length}/${maxT}` },
      { type: "field" as const, k: E("A DÓNDE LLEVA (OPCIONAL, UNA RUTA DE TO'LATINO)", "WHERE IT LEADS (OPTIONAL, A TO'LATINO PATH)"), val: f.href, onChange: (v: string) => set({ href: v.trim() }), ph: "/publica", max: 200 },
      { type: "field" as const, k: E("CUÁNDO (AAAA-MM-DD HH:MM, HORA DE LA CIUDAD; VACÍO = AHORA)", "WHEN (YYYY-MM-DD HH:MM, CITY TIME; EMPTY = NOW)"), val: f.cuando, onChange: (v: string) => set({ cuando: v }), ph: "2026-11-20 10:00", max: 16 },
      { type: "acts" as const, items: [{ l: E("Programar la campaña", "Schedule the campaign"), v: "action", icon: "bell", off: !listo, onClick: () => setConf({ titulo: E("Programar la campaña", "Schedule the campaign"), cta: E("Programar", "Schedule"),
        sub: E("Sale a su hora (nunca de noche). Queda en la auditoría con tu motivo.", "It goes out on time (never at night). It goes in the audit trail with your reason."), plantillas: [E("Reclutar negocios para la apertura.", "Recruit businesses for the opening."), E("Aviso a los vecinos.", "Notice to neighbors.")],
        hacer: (m) => { const v = ref.current; return campanaCrear({ nombre: v.nombre, tipo: v.tipo, canal: v.canal, ciudad: v.ciudad, segmento: { rol: v.rol, inactivos: v.inactivos || null, cat: v.cat || null, plan: v.plan || null }, tituloEs: v.tituloEs, tituloEn: v.tituloEn, textoEs: v.textoEs, textoEn: v.textoEn, href: v.href, cuando: v.cuando }, m); } }) }] },
    ] : []),
  ]} />;
}

function Destacados({ d, E, cuando, setConf }: { d: DatosCrec; E: EFn; cuando: (iso: string | null) => string; setConf: SetConf }) {
  const F = d.feat!, ciudad = d.ciudadForm;
  const [q, setQ] = useState(""), [res, setRes] = useState<{ id: string; nombre: string; pro: boolean }[]>([]);
  useEffect(() => { let vivo = true; if (q.trim().length < 2) { setRes([]); return; } const x = setTimeout(() => { void destacadoBuscar(ciudad, q).then((r) => { if (vivo) setRes(r); }); }, 250); return () => { vivo = false; clearTimeout(x); }; }, [q, ciudad]);
  const accion = (id: string, nombre: string, modo: "fijar" | "quitar") => setConf({ titulo: modo === "fijar" ? E(`Fijar ${nombre}`, `Pin ${nombre}`) : E(`Quitar ${nombre} de la rotación`, `Remove ${nombre} from rotation`), cta: modo === "fijar" ? E("Fijar", "Pin") : E("Quitar", "Remove"),
    sub: E(`Dura ${F.dias} días y vuelve solo a la rotación. Queda en la auditoría.`, `It lasts ${F.dias} days and returns to the rotation on its own. It goes in the audit trail.`), plantillas: modo === "fijar" ? [E("Negocio nuevo de la campaña.", "New business from the campaign."), E("Temporada.", "Season.")] : [E("Queja abierta.", "Open complaint."), E("Pidió no salir.", "Asked not to show.")],
    hacer: (m) => destacadoFijar(ciudad, id, modo, m) });
  return <PanelBloques bloques={[
    { type: "note", tone: "info", icon: "star", t: E(`Destacados = los Pro de la portada de Negocios. Rotación diaria automática; aquí fijas o quitas a mano por ${F.dias} días con motivo. Fijados a la vez: ${F.fijados} de ${F.tope}.`, `Featured = the Pro on the Businesses cover. Automatic daily rotation; here you pin or remove manually for ${F.dias} days with a reason. Pinned at once: ${F.fijados} of ${F.tope}.`) },
    { type: "rows", k: E("HOY EN LA VITRINA (LO QUE VE EL VECINO)", "TODAY IN THE SHOWCASE (WHAT NEIGHBORS SEE)"), items: F.hoy.length ? F.hoy.map((b, i) => ({ key: b.id, icon: "store", t: `${i + 1}. ${b.nombre}`, s: b.abierto ? E("abierto ahora", "open now") : E("cerrado ahora", "closed now"),
      tag: F.lista.some((x) => x.vivo && x.modo === "fijar" && x.negocio === b.id) ? E("FIJADO", "PINNED") : E("ROTACIÓN", "ROTATION"), tone: F.lista.some((x) => x.vivo && x.modo === "fijar" && x.negocio === b.id) ? "action" : "neutral",
      acts: d.puede.editar && !F.lista.some((x) => x.vivo && x.negocio === b.id) ? [{ l: E("Quitar", "Remove"), v: "secondary", onClick: () => accion(b.id, b.nombre, "quitar") }] : undefined })) : [{ t: E("La ciudad todavía no abre o no hay Pro abiertos ahora.", "The city is not open yet or no Pro is open right now."), icon: "info" }] },
    F.lista.length ? { type: "rows", k: E("FIJADOS Y QUITADOS", "PINNED AND REMOVED"), items: F.lista.map((x) => ({ key: x.id, icon: x.modo === "fijar" ? "star" : "ban", t: x.nombre,
      s: `${x.modo === "fijar" ? E("Fijado", "Pinned") : E("Quitado de la rotación", "Removed from rotation")} · ${E("hasta", "until")} ${cuando(x.hasta)} · ${x.motivo}${x.quien ? ` · ${x.quien}` : ""}${x.razon ? ` · ${E("retirado", "retired")}: ${x.razon}` : ""}`,
      tag: x.vivo ? E("VIVO", "LIVE") : E("TERMINÓ", "ENDED"), tone: x.vivo ? "signal" : "neutral", dim: !x.vivo,
      acts: d.puede.editar && x.vivo ? [{ l: E("Retirar", "Retire"), v: "secondary", onClick: () => setConf({ titulo: E(`Retirar: ${x.nombre}`, `Retire: ${x.nombre}`), cta: E("Retirar", "Retire"), peligro: true,
        sub: E("Vuelve a la rotación de siempre. Nada se borra.", "It returns to the usual rotation. Nothing is deleted."), plantillas: [E("Ya no hace falta.", "No longer needed.")], hacer: (m) => destacadoRetirar(x.id, m) }) }] : undefined })) } : { type: "empty", icon: "star", t: E("Nada fijado ni quitado", "Nothing pinned or removed"), s: E("La vitrina rota sola entre los Pro abiertos con foto.", "The showcase rotates on its own among open Pro with a photo.") },
    ...(d.puede.editar ? [
      { type: "group" as const, k: E("FIJAR UN NEGOCIO", "PIN A BUSINESS") },
      { type: "search" as const, val: q, ph: E("Nombre del negocio", "Business name"), onChange: setQ, onClear: () => setQ("") },
      ...(res.length ? [{ type: "rows" as const, items: res.map((b) => ({ key: b.id, icon: "store", t: b.nombre, s: b.pro ? "Pro" : "Free", acts: [{ l: E("Fijar", "Pin"), v: "action", onClick: () => accion(b.id, b.nombre, "fijar") }, { l: E("Quitar", "Remove"), v: "secondary", onClick: () => accion(b.id, b.nombre, "quitar") }] })) }] : []),
    ] : []),
  ]} />;
}

function Enlaces({ d, E, cuando, setConf, ir, setToast, nombreCiudad, l }: { d: DatosCrec; E: EFn; cuando: (iso: string | null) => string; setConf: SetConf; ir: (q: Record<string, string | null>) => void; setToast: (t: string) => void; nombreCiudad: (id: string | null) => string; l: L }) {
  const LI = d.links!;
  const [f, setF] = useState({ label: "", target: "/acceso", tipo: "calle" as TipoEnlace, ciudad: d.ciudadForm }), ref = useRef(f); ref.current = f;
  const [det, setDet] = useState<Awaited<ReturnType<typeof enlaceEscaneos>>>(null);
  useEffect(() => { let vivo = true; if (d.ver) void enlaceEscaneos(d.ver).then((x) => { if (vivo) setDet(x); }); return () => { vivo = false; }; }, [d.ver]);
  const base = typeof window === "undefined" ? "" : window.location.origin;
  const copiar = async (code: string) => { try { await navigator.clipboard.writeText(`${base}/q/${code}`); setToast(E("Copiado.", "Copied.")); } catch { setToast(`${base}/q/${code}`); } };
  const fila = (x: EnlaceAdm): Fila => ({ key: x.code, icon: x.vivo ? "globe" : "ban", t: `${x.label} · /q/${x.code}`, dim: !x.vivo,
    s: `${E(TIPO_ENLACE[x.kind].es, TIPO_ENLACE[x.kind].en)} · ${nombreCiudad(x.city)} · ${E("lleva a", "goes to")} ${x.target}${x.campana ? ` · ${x.campana}` : ""}`,
    m: `${x.total} ${E("ESCANEOS", "SCANS")} · ${x.d30} ${E("EN 30 DÍAS", "IN 30 DAYS")} · ${x.hoy} ${E("HOY", "TODAY")} · ${cuando(x.at).toUpperCase()}${x.quien ? ` · ${x.quien.toUpperCase()}` : ""}`,
    tag: x.vivo ? E("VIVO", "LIVE") : E("RETIRADO", "RETIRED"), tone: x.vivo ? "signal" : "neutral",
    acts: x.vivo ? [
      { l: E("Escaneos", "Scans"), v: "secondary", onClick: () => ir({ ver: x.code }) },
      { l: E("Copiar", "Copy"), v: "secondary", onClick: () => void copiar(x.code) },
      { l: E("PDF carta", "PDF letter"), v: "secondary", onClick: () => window.open(`/admin/crecimiento/volante/${x.code}?f=carta`, "_blank", "noopener") },
      { l: E("PDF media carta", "PDF half letter"), v: "secondary", onClick: () => window.open(`/admin/crecimiento/volante/${x.code}?f=media`, "_blank", "noopener") },
      ...(d.puede.editar ? [{ l: E("Retirar", "Retire"), v: "secondary", onClick: () => setConf({ titulo: E(`Retirar /q/${x.code}`, `Retire /q/${x.code}`), cta: E("Retirar", "Retire"), peligro: true,
        sub: E("El QR impreso deja de contar y lleva al Inicio. Nada se borra.", "The printed QR stops counting and goes to the Home. Nothing is deleted."), plantillas: [E("Se quitaron los volantes.", "The flyers were removed."), E("Destino equivocado.", "Wrong destination.")], hacer: (m) => enlaceRetirar(x.code, m) }) }] : []),
    ] : undefined });
  const max = det ? Math.max(1, ...det.dias.map((x) => x.n)) : 1;
  const mix = (app: string, ua: string) => det?.mix.find((x) => x.app === app && x.ua === ua)?.n ?? 0;
  return <PanelBloques bloques={[
    { type: "note", tone: "info", icon: "globe", t: E("Cada enlace es tolatino.com/q/{código} y su QR. Cuenta cada escaneo sin guardar quién: ni la dirección, ni el teléfono, ni la cuenta. El destino es siempre una página de To'Latino.", "Each link is tolatino.com/q/{code} and its QR. It counts every scan without storing who: no address, no phone, no account. The destination is always a To'Latino page.") },
    ...(det ? [
      { type: "chart" as const, k: `${E("ESCANEOS POR DÍA · 30 DÍAS", "SCANS PER DAY · 30 DAYS")} · /q/${det.code} · ${det.label}`, v: String(det.dias.reduce((a, x) => a + x.n, 0)),
        bars: det.dias.map((x, i) => ({ h: `${Math.round((x.n / max) * 100)}%`, on: i === det.dias.length - 1, l: i % 7 === 6 ? x.dia.slice(8) : undefined })), s: E("Hora de la ciudad.", "City time.") },
      { type: "kv" as const, cols: 2, items: [{ k: E("TELÉFONO · WEB", "PHONE · WEB"), v: String(mix("web", "telefono")) }, { k: E("ESCRITORIO · WEB", "DESKTOP · WEB"), v: String(mix("web", "escritorio")) },
        { k: E("EN LA APP", "IN THE APP"), v: String(det.mix.filter((x) => x.app === "app").reduce((a, x) => a + x.n, 0)) }, { k: E("OTRO", "OTHER"), v: String(mix("web", "otro")) }] },
      { type: "acts" as const, items: [{ l: E("Cerrar", "Close"), v: "secondary", onClick: () => ir({ ver: null }) }] },
    ] : []),
    LI.filas.length ? { type: "rows", k: `${E("ENLACES", "LINKS")} · ${LI.filas.length}${LI.mas ? "+" : ""}`, cols: "minmax(0,1fr)", items: LI.filas.map(fila) } : { type: "empty", icon: "globe", t: E("Sin enlaces", "No links"), s: E("Crea el primero abajo y descarga su volante.", "Create the first one below and download its flyer.") },
    ...(LI.mas ? [{ type: "acts" as const, items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir({ desde: LI.mas }) }] }] : []),
    ...(d.puede.editar ? [
      { type: "group" as const, k: E("NUEVO ENLACE Y QR", "NEW LINK AND QR") },
      { type: "field" as const, k: E("DÓNDE VA (EL NOMBRE PARA EL EQUIPO)", "WHERE IT GOES (NAME FOR THE TEAM)"), val: f.label, onChange: (v: string) => setF((x) => ({ ...x, label: v })), ph: E("Bodega de Alter St", "Alter St bodega"), max: 80 },
      { type: "chips" as const, k: E("TIPO", "TYPE"), items: TIPOS_ENLACE.map((t) => ({ l: E(TIPO_ENLACE[t].es, TIPO_ENLACE[t].en), v: f.tipo === t ? "selected" : "filter", onClick: () => setF((x) => ({ ...x, tipo: t })) })) },
      { type: "chips" as const, k: E("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: c.name, v: f.ciudad === c.id ? "selected" : "filter", onClick: () => setF((x) => ({ ...x, ciudad: c.id })) })) },
      { type: "chips" as const, k: E("LLEVA A", "GOES TO"), items: DESTINOS.map(([r, es, en]) => ({ l: l === "es" ? es : en, v: f.target === r ? "selected" : "filter", onClick: () => setF((x) => ({ ...x, target: r })) })) },
      { type: "field" as const, k: E("O UNA RUTA DE TO'LATINO", "OR A TO'LATINO PATH"), val: f.target, onChange: (v: string) => setF((x) => ({ ...x, target: v.trim() })), ph: "/c/comida", max: 200 },
      { type: "acts" as const, items: [{ l: E("Crear el enlace", "Create the link"), v: "action", icon: "plus", off: f.label.trim().length < 2 || !f.target.startsWith("/"), onClick: () => setConf({ titulo: E("Crear el enlace y su QR", "Create the link and its QR"), cta: E("Crear", "Create"),
        sub: E("Funciona al instante. No se edita: se retira y se crea otro.", "It works right away. It is not edited: retire it and create another."), plantillas: [E("Volantes de la campaña.", "Campaign flyers."), E("Cartel en la iglesia.", "Church poster.")],
        hacer: (m) => enlaceCrear(ref.current, m) }) }] },
    ] : []),
  ]} />;
}

function Lista({ d, E, cuando, setConf, ir, l }: { d: DatosCrec; E: EFn; cuando: (iso: string | null) => string; setConf: SetConf; ir: (q: Record<string, string | null>) => void; l: L }) {
  const W = d.lista!;
  const [fecha, setFecha] = useState(W.fecha.fecha ?? ""), ref = useRef(fecha); ref.current = fecha;
  const modo = (m: Modo | null) => (m ? (l === "es" ? MODO[m].es : MODO[m].en) : E("sin decir cómo", "did not say how"));
  return <PanelBloques bloques={[
    { type: "note", tone: "info", icon: "lock", t: E("La lista de la landing: cada persona entró con el código de su teléfono y queda en «Avísame» de su ciudad. Aquí no se ven teléfonos ni nombres: el código postal, lo que dijo de su negocio y su número de fundador. Le escribimos una sola vez: el día que abra su zona.", "The landing list: each person signed in with their phone code and is on their city’s “Notify me”. No phones or names here: the ZIP code, what they said about their business and their founder number. We text them only once: the day their area opens.") },
    { type: "rows", k: E("POR CIUDAD", "BY CITY"), cols: "repeat(auto-fill,minmax(220px,1fr))", items: W.porCiudad.map((c) => ({ key: c.city, icon: "pin", t: `${c.nombre} · ${c.n}`, s: `${c.neg} ${E("negocios apartados", "businesses held")} · ${c.fv} ${E("fundadores", "founders")}`,
      tag: c.status === "on" ? E("ABIERTA", "OPEN") : E("PRONTO", "SOON"), tone: c.status === "on" ? "signal" : "action", onClick: () => ir({ c: c.city, desde: null }) })) },
    { type: "rows", k: E("NEGOCIOS APARTADOS POR TIPO", "BUSINESSES HELD BY TYPE"), cols: "repeat(auto-fill,minmax(200px,1fr))", items: W.porModo.length ? W.porModo.map((x, i) => ({ key: String(i), icon: "store", t: `${modo(x.modo)} · ${x.n}` })) : [{ t: E("Todavía ninguno.", "None yet."), icon: "store" }] },
    { type: "rows", k: E("CÓDIGOS POSTALES", "ZIP CODES"), cols: "repeat(auto-fill,minmax(160px,1fr))", items: W.porZip.length ? W.porZip.map((x) => ({ key: x.zip, icon: "pin", t: `${x.zip} · ${x.n}`, compact: true })) : [{ t: "—", icon: "pin" }] },
    ...(W.fuera.length ? [{ type: "rows" as const, k: E("DE FUERA · PIDE TU CIUDAD", "OUTSIDE · ASK FOR YOUR CITY"), cols: "repeat(auto-fill,minmax(160px,1fr))", items: W.fuera.map((x) => ({ key: x.pedida, icon: "bell", t: `${x.pedida} · ${x.n}`, compact: true })) }] : []),
    { type: "rows", k: E("LOS ÚLTIMOS EN ANOTARSE", "LATEST SIGN-UPS"), items: W.filas.length ? W.filas.map((x: EntradaLista) => ({ key: x.id, icon: x.negocio ? "store" : "users",
      t: `${x.ciudad ?? x.pedida ?? ""} · ${x.zip}${x.negocio ? ` · ${x.nombreNegocio ?? E("negocio", "business")} (${modo(x.modo)})` : ""}`,
      s: `${cuando(x.at)}${x.fv ? ` · ${E("fundador", "founder")} ${x.fv}` : ""}${x.fn ? ` · ${E("negocio fundador", "founding business")} ${x.fn}` : ""}${x.prueba ? ` · ${E("de prueba", "test")}` : ""}` })) : [{ t: E("Nadie todavía.", "Nobody yet."), icon: "users" }] },
    ...(W.mas ? [{ type: "acts" as const, items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir({ desde: W.mas }) }] }] : []),
    { type: "group", k: E("LA FECHA DE APERTURA EN LA LANDING", "THE OPENING DATE ON THE LANDING") },
    { type: "note", tone: W.fecha.visible ? "ok" : "info", icon: "calendar", t: W.fecha.visible ? E(`Visible: la landing dice «Abre el ${W.fecha.fecha}».`, `Visible: the landing says “Opens on ${W.fecha.fecha}”.`) : E("Oculta (como el diseño v3): la landing no dice fecha.", "Hidden (as in design v3): the landing shows no date.") },
    ...(d.puede.aprobar && d.puede.todas ? [
      { type: "field" as const, k: E("FECHA (AAAA-MM-DD)", "DATE (YYYY-MM-DD)"), val: fecha, onChange: setFecha, ph: "2027-03-01", max: 10 },
      { type: "acts" as const, items: [
        { l: W.fecha.visible ? E("Ocultar la fecha", "Hide the date") : E("Mostrar la fecha", "Show the date"), v: W.fecha.visible ? "secondary" : "action", off: !W.fecha.visible && !/^\d{4}-\d{2}-\d{2}$/.test(fecha), onClick: () => setConf({
          titulo: W.fecha.visible ? E("Ocultar la fecha", "Hide the date") : E("Mostrar la fecha en la landing", "Show the date on the landing"), cta: E("Guardar", "Save"),
          sub: E("Las cinco ciudades abren el mismo día (decisión A). Queda en la auditoría.", "The five cities open the same day (decision A). It goes in the audit trail."), plantillas: [E("Fecha confirmada por el fundador.", "Date confirmed by the founder.")],
          hacer: (m) => landingFecha(!W.fecha.visible, ref.current, m) }) }] },
    ] : []),
  ]} />;
}
