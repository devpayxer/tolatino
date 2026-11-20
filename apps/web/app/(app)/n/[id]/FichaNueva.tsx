"use client";
/* C-005 · Ficha nueva del negocio (canvas tolatino-master+ «To'Latino Barbería El Rey (móvil / desktop)», «To'Latino Fichas (app)» y
   «(desktop app)»; lógica: _tmp/c008/fichas_logic.js y ficha3.js). Solo negocios Pro: la ficha Free no cambia (Ficha.tsx).
   Cambia cómo se ve, no las reglas: la reserva usa las mismas acciones del servidor (horasDeCita) y termina en Booking (/cita),
   que vuelve a revisar todo y cobra el depósito; las reseñas, Novedades, Jobs y Eventos usan sus piezas de siempre.
   Reglas de la ficha (cambios.md · paquete C-005 → C-008):
   · «Abierto · cierra a las N» una sola vez, junto al nombre; la tarjeta de hoy y la barra de abajo no lo repiten.
   · Sin textos que expliquen lo obvio. Mismos textos en teléfono y computadora; todo con el sistema de diseño.
   · Teléfono: cada pestaña cambia el contenido, la pestaña activa siempre se ve y abajo hay una barra con una sola acción.
   · Computadora: una sola página con secciones; las pestañas se quedan pegadas arriba (con flechas si no caben) y llevan a cada
     sección; la tarjeta de reservar se queda pegada a la derecha.
   · Pestañas en este orden y solo si hay contenido: Resumen · lo que vende · equipo · Reseñas · Novedades · Eventos · Jobs ·
     Horario · Antes de ir · Relacionados. Un dato que falta se omite (nunca «undefined» ni «null»). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import type { ficha } from "@/lib/ficha";
import type { CitasPublica, HorasCita } from "@/lib/citas";
import type { ResumenResenas } from "@/lib/resenas";
import type { NovedadesFicha } from "@/lib/novedades";
import type { VacanteFicha } from "@/lib/jobs";
import type { TarjetaEvt } from "@/lib/evt-publico";
import { compartir as compartirNativo } from "@/lib/nativo/compartir";
import { abrirComoLlegar } from "@/lib/como-llegar";
import { MiniMapa } from "@/app/_dir/MiniMapa";
import { useAncho } from "@/app/_ancho/Ancho";
import { guardarNegocio, registrarToque } from "../../acciones";
import { horasDeCita } from "./acciones-cita";
import { aprL, citaUrl, dinero, diaS, durL, horaL, precio, SvcHoja, useSvc, type Svc } from "./Servicios";
import { aspectos, ResCapas, ResResumen, ResTab, useResenas, type CtlResenas } from "./Resenas";
import { NovTab } from "./Novedades";
import { JobsTab } from "./Jobs";
import { EventosTab } from "./Eventos";
import { CFG_FICHA, type Cfg } from "@/lib/ficha-nueva";
import { primerNombre } from "@/lib/nombre";
import type { MenuPublico } from "@/lib/pedir";
import type { RsvPublica } from "@/lib/reservas";
import type { OficiosPublico } from "@/lib/oficios-publico";
import type { SaludPublico } from "@/lib/salud-publico";
import type { ProPublico } from "@/lib/pro-publico";
import type { MercPublico } from "@/lib/merc-publico";
import type { FiestaPublico } from "@/lib/fiestas-publico";
import type { TransPublico } from "@/lib/trans-publico";
import type { NochePublica } from "@/lib/noche-publico";
import type { InscPublica } from "@/lib/inscripciones-publico";
import type { FePublica } from "@/lib/fe-publico";
import type { InmPublica } from "@/lib/inmuebles-publico";
import type { AutosPublica } from "@/lib/autos-publico";
import type { ArticuloRenta } from "@/lib/rentas";
import type { ArticuloVenta } from "@/lib/apartados";
import { MenuCapas, MenuDesk, MenuMovil, MenuResumen, PedidoTarjeta, useMenu } from "./MenuCliente";
import { RsvBarra, RsvRiel, RsvTab, useRsv, RsvRapida } from "./Reservar";
import { HojaCasa, HojaVehiculo, OfBarra, OfHoja, OfRiel, OfTab, useOficio, OfResumen } from "./Oficios";
import { SaBarra, SaHoja, SaRiel, SaSeguro, SaTab, useSalud, SaResumen } from "./Salud";
import { PrBarra, PrHoja, PrRiel, PrTab, usePro, PrResumen } from "./Pro";
import { FiBarra, FiFecha, FiHoja, FiRiel, FiTab, useFiesta, FiResumen } from "./Fiesta";
import { ViBarra, ViHoja, ViRiel, ViTab, useViaje, ViResumen } from "./Viaje";
import { NoBarra, NoHoja, NoRiel, NoTab, useNoche, NoResumen } from "./Noche";
import { InBarra, InHoja, InRiel, InTab, useInsc, InResumen } from "./Insc";
import { FeBarra, FeContacto, FeHoja, FeRiel, FeTab, useFe, FeResumen } from "./Fe";
import { InmBarra, InmHoja, InmRiel, InmTab, useInm, InmResumen } from "./Inmueble";
import { DlBarra, DlHoja, DlRiel, DlTab, useDealer, DlResumen } from "./Dealer";
import { MeBarra, MeHoja, MeRiel, useMerc, MeResumen, MeMenu, MeOrderBar } from "./Mercado";
import { TiendaTab } from "./Tienda";
import { HojaEntrar } from "../../HojaEntrar";
import { VideoPortada } from "../../VideoNegocio";
import { dosIdiomas } from "@/lib/dos-idiomas";

type N = "Icon" | "Button" | "IconButton" | "Tabs" | "DesktopTabs" | "TodayCard" | "HoursPro" | "Tag" | "Chip" | "OwnerCard" | "SectionHeader" | "ServiceRow"
  | "Placeholder" | "ReviewCard" | "StaffPicker" | "DateStrip" | "TimeSlots" | "StepHeader" | "TotalBar" | "DepositNote" | "DepositOutcomes" | "Eyebrow"
  | "BusinessRow" | "OptionGroup";
const { Icon, Button, IconButton, Tabs, DesktopTabs, TodayCard, HoursPro, Tag, Chip, OwnerCard, SectionHeader, ServiceRow, Placeholder, ReviewCard, StaffPicker,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DateStrip, TimeSlots, StepHeader, TotalBar, DepositNote, DepositOutcomes, Eyebrow, BusinessRow, OptionGroup } = UI as unknown as Record<N, ComponentType<any>>;

type F = NonNullable<Awaited<ReturnType<typeof ficha>>> & { guardado: boolean };
type Textos = Record<string, string>;

/* ── Lo que la ficha necesita de cada categoría ── */
type Fila = { id: string; name: string; meta: string; price: string };
type Grupo = { label: string; name: string; items: Fila[] };
type Persona = { id: string; name: string; short: string; role: string; spec: string; foto: string | null; owner: boolean; silla: number | null };

type TiendaP = Pick<ComponentProps<typeof TiendaTab>, "L" | "V" | "mia" | "horas" | "plan">;
export function FichaNueva({ f: f0, t, svc, menu, rsv, ofi, salud, prof, merc, fiesta, trans, noche, insc, fe, inm, dl, tienda, resenas, novedades, jobs, eventos = [], sesion, es, tabInicial, platoInicial, productoInicial, rsvInicial }: {
  f: F; t: Textos; svc: CitasPublica | null; menu?: MenuPublico | null; rsv?: RsvPublica | null; ofi?: OficiosPublico | null; salud?: SaludPublico | null; prof?: ProPublico | null;
  merc?: MercPublico | null; fiesta?: FiestaPublico | null; trans?: TransPublico | null; noche?: NochePublica | null; insc?: InscPublica | null; fe?: FePublica | null;
  inm?: InmPublica | null; dl?: AutosPublica | null; tienda?: (TiendaP & { L: ArticuloRenta[]; V: ArticuloVenta[]; pop?: string[]; g?: string[] }) | null;
  resenas: ResumenResenas | null; novedades: NovedadesFicha | null; jobs: VacanteFicha[]; eventos?: TarjetaEvt[]; sesion: boolean; es: boolean; tabInicial?: string; platoInicial?: string; productoInicial?: string; rsvInicial?: { p?: number; i?: number; h?: number; editar?: string };
}) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const L = (x: [string, string]) => (es ? x[0] : x[1]);
  const router = useRouter();
  let f = f0;
  const cfg = CFG_FICHA[f.cat]!;
  const sv = useSvc(svc, es);
  // C-006 · Las demás categorías: sus mismas piezas (pestaña, hoja, barra y columna) dentro de la ficha nueva; la lógica no cambia.
  const [entrar, setEntrar] = useState(false);
  const pagar = () => { if (sesion) router.push(`/n/${f.id}/pagar`); else setEntrar(true); };
  const mn = useMenu(menu && !menu.vacio ? menu : null, es, { onPay: pagar, sesion });
  const rv = useRsv(rsv ?? null, es, sesion, rsvInicial?.editar ?? null, rsvInicial ?? {});
  const ov = useOficio(ofi ?? null, es, sesion);
  const sa = useSalud(salud ?? null, es);
  const pr = usePro(prof ?? null, es);
  const fi = useFiesta(fiesta ?? null, es, true);
  const vi = useViaje(trans ?? null, es, true);
  const accFn = { llamar: () => llamarR.current(), escribir: () => escribirR.current(), llegar: () => llegarR.current() };
  const no = useNoche(noche ?? null, es, true, { ...accFn, reservar: (sx, pax) => router.push(`/n/${f.id}/noche?s=${sx}&p=${pax}`), ir: (href) => router.push(href) });
  const ins = useInsc(insc ?? null, es, true, accFn);
  const acc4i = { ...accFn, irTab: () => irCat(), pedir: (href: string) => router.push(href) };
  const fv = useFe(fe ?? null, es, true, acc4i);
  const iv = useInm(inm ?? null, es, true, acc4i);
  const dv = useDealer(dl ?? null, es, true, acc4i);
  const me = useMerc(merc ?? null, es, sesion);
  // 9t · ?producto=<id>: la hoja de ese producto del mercado se abre una vez, ya hidratada la ficha (la de la tienda la abre TiendaTab).
  const productoHecho = useRef(false);
  useEffect(() => { if (productoHecho.current || !productoInicial || !me) return; productoHecho.current = true; if (me.mp.prods.some((p) => p.id === productoInicial)) me.abrir(productoInicial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // DJ y promotor no tienen local (neg-noche-kind.js post): «Por fecha» en vez de «Cerrado · Abre a las…», como en la ficha de siempre.
  const porContrato = !!no && no.np.porFecha && no.np.kind !== "salon";
  if (porContrato) f = { ...f, abierto: true, estadoCorto: E2("Por fecha", "By date"), estadoResto: E2("· no hay local", "· no venue"),
    hoy: { eyebrow: E2("CÓMO TRABAJA", "HOW THEY WORK"), title: no!.np.kind === "promo" ? E2("Según la noche", "Depends on the night") : E2("Por contrato", "By contract"), dot: "var(--tl-action)",
      sub: E2("Toca en discotecas y fiestas; no hay local. Pide tu fecha y te mandan el precio por escrito.", "Plays clubs and parties; no venue. Ask for your date and get the price in writing."), cols: [] } };
  const llamarR = useRef<() => void>(() => undefined), escribirR = useRef<() => void>(() => undefined), llegarR = useRef<() => void>(() => undefined);
  const irCat = () => (typeof window !== "undefined" && window.innerWidth >= 1024 ? ir("cat") : setTab("cat"));
  const rs = useResenas(resenas, f.id, sesion, es);
  const [guardado, setGuardado] = useState(f.guardado);
  const [aviso, setAviso] = useState<string | null>(null);
  const [faq, setFaq] = useState<number>(0);
  const [catF, setCatF] = useState("all");

  // ── Lo que vende, el equipo y la reserva (Belleza: citas) ──
  const grupos: Grupo[] = sv ? sv.secs.map((s) => ({ label: s.title, name: s.title.charAt(0) + s.title.slice(1).toLowerCase(), items: s.items.map((x) => ({ id: x.id, name: x.name, meta: x.meta, price: x.price })) })) : [];
  const nItems = grupos.reduce((a, g) => a + g.items.length, 0);
  const gente: Persona[] = sv ? sv.cp.gente.map((p) => {
    const nx = sv.prx(p.id);
    return { id: p.id, name: p.nombre, short: p.corto, foto: p.foto, owner: p.kind === "owner", silla: p.silla,
      role: p.kind === "owner" ? E2("Dueño", "Owner") : p.silla ? `${sv.w.uno.charAt(0).toUpperCase()}${sv.w.uno.slice(1)} · ${sv.w.silla} ${p.silla}` : `${sv.w.uno.charAt(0).toUpperCase()}${sv.w.uno.slice(1)}`,
      // Lo que daba «Por barbero»: si confirma al instante o en cuánto responde, y su próxima hora.
      spec: [sv.cp.can ? aprL(p, es) : null, nx ? `${E2("PRÓXIMA HORA", "NEXT OPENING")} · ${sv.nxL(nx)}`.toUpperCase() : null].filter(Boolean).join(" · ") };
  }) : [];
  if (!sv) for (const p of f.equipo) gente.push({ id: p.id, name: p.name, short: primerNombre(p.name), role: p.role, spec: "", foto: p.foto, owner: p.owner, silla: null });
  const staffBook = !!sv && sv.cp.can && (sv.silla || (sv.cp.pol.pick && gente.length > 1));
  // 9n · Staff en pausa (modules_off.staff): la página no presenta al equipo; quién se puede elegir al reservar sigue siendo de Citas (gente / staffBook no cambian).
  const verEquipo = f.equipoOff ? [] : gente;
  const [bk, setBk] = useState<Bk | null>(null);
  const abrirReserva = (o: Partial<Bk> = {}) => { if (!sv || !sv.cp.can) return; setBk({ ...nuevaBk(sv), ...o, step: 1 }); };
  // Computadora: la tarjeta de la derecha guarda su propia elección; elegir a alguien del equipo la ilumina un momento.
  const [dsk, setDsk] = useState<Bk>(() => (sv ? nuevaBk(sv) : { who: "any", svc: null, opts: {}, i: 0, h: null, step: 1 }));
  const [pulso, setPulso] = useState(false);
  const elegirDesk = (o: Partial<Bk>) => { setDsk((d) => ({ ...d, ...o, h: null })); setPulso(true); setTimeout(() => setPulso(false), 900); };

  // ── C-006 · Lo que vende de las demás categorías: su pestaña, su barra, su hoja y su columna de siempre ──
  type ItemV = { id: string; name: string; meta?: string; price?: string; k?: string };
  // tabL: el nombre de la pestaña según el tipo (despensa «Ayuda», funeraria «Servicios», préstamos «Préstamos»…), como en la ficha de siempre.
  type Vende = { tabL?: string; tab: (desk: boolean) => ReactNode; resumen?: (desk: boolean) => ReactNode; riel: ReactNode; barra: ReactNode; capas: ReactNode; top: (Fila & { k?: string })[]; n: number; pick: (id: string, k?: string) => void;
    hoy: { title: string; cols: { k: string; v: string }[] } | null };
  const deSecs = (secs: { title: string; items: ItemV[] }[]) => ({
    top: secs.slice(0, 3).map((g) => g.items[0]).filter(Boolean).map((x) => ({ id: x!.id, name: x!.name, meta: x!.meta ?? "", price: x!.price ?? "", k: x!.k })),
    n: secs.reduce((a, g) => a + g.items.length, 0) });
  // Cada columna de la tarjeta de hoy, una sola vez (la clave es su nombre).
  const unicas = (c: { k: string; v: string }[]) => c.filter((x, i) => x.v && x.v !== "—" && c.findIndex((y) => y.k === x.k) === i);
  // Un precio o una cifra sola no dice nada como título: va con su nombre («Sin seguro · $85»).
  const titulo = (x: { k: string; v: string }) => (/^[$\d~]/.test(x.v) ? `${x.k.charAt(0)}${x.k.slice(1).toLowerCase()} · ${x.v}` : x.v);
  const deRiel = (r: { k: string; v: string }[] | undefined | null) => (r && r.length ? { title: titulo(r[0]!), cols: unicas(r.slice(1)).filter((x) => x.k !== r[0]!.k).slice(0, 3) } : null);
  const deTd = (td: { k: string; v: string }[] | undefined | null, title: string) => (td && td.length ? { title, cols: unicas(td).slice(0, 3) } : null);
  const vende: Vende | null = useMemo(() => {
    const X = (v: { secs: { title: string; items: ItemV[] }[]; tabL?: string }, o: Omit<Vende, "top" | "n">): Vende => ({ ...deSecs(v.secs), tabL: v.tabL, ...o });
    if (ov) return X(ov, { resumen: (d) => <OfResumen v={ov} desk={d} onAll={irCat} />, tab: (d) => <OfTab v={ov} desk={d} />, riel: <OfRiel v={ov} onCta={irCat} />, barra: <OfBarra v={ov} onCta={irCat} />,
      capas: <><OfHoja v={ov} /><HojaVehiculo v={ov} /><HojaCasa v={ov} /></>, pick: (id) => ov.abrir(id), hoy: deRiel(ov.riel) });
    if (sa) return X(sa, { resumen: (d) => <SaResumen v={sa} desk={d} onAll={irCat} />, tab: (d) => <SaTab v={sa} desk={d} />, riel: <SaRiel v={sa} onCta={irCat} />, barra: <SaBarra v={sa} onCta={irCat} />,
      capas: <><SaHoja v={sa} />{sa.segHoja ? <SaSeguro v={sa} /> : null}</>, pick: (id) => sa.abrir(id), hoy: deRiel(sa.riel) });
    if (pr) return X(pr, { resumen: (d) => <PrResumen v={pr} desk={d} onAll={irCat} />, tab: (d) => <PrTab v={pr} desk={d} />, riel: <PrRiel v={pr} onCta={irCat} />, barra: <PrBarra v={pr} onCta={irCat} />, capas: <PrHoja v={pr} />, pick: (id) => pr.abrir(id), hoy: deRiel(pr.riel) });
    if (fi) return X(fi, { resumen: (d) => <FiResumen v={fi} desk={d} onAll={irCat} />, tab: (d) => <FiTab v={fi} desk={d} />, riel: <FiRiel v={fi} onCta={irCat} />, barra: <FiBarra v={fi} onCta={irCat} />, capas: <><FiHoja v={fi} /><FiFecha v={fi} /></>, pick: (id) => fi.abrir(id), hoy: deRiel(fi.riel) });
    if (vi) return X(vi, { resumen: (d) => <ViResumen v={vi} desk={d} onAll={irCat} />, tab: (d) => <ViTab v={vi} desk={d} />, riel: <ViRiel v={vi} onCta={irCat} />, barra: <ViBarra v={vi} onCta={irCat} />, capas: <ViHoja v={vi} />, pick: (id) => vi.abrir(id), hoy: deRiel(vi.riel) });
    if (no) return X(no, { resumen: (d) => <NoResumen v={no} desk={d} onAll={irCat} />, tab: (d) => <NoTab v={no} desk={d} />, riel: <NoRiel v={no} onCta={irCat} />, barra: <NoBarra v={no} onCta={irCat} />, capas: <NoHoja v={no} />, pick: (id, k) => no.abrir(id, k ?? ""), hoy: deTd(no.td, no.linea || f.subsLinea) });
    if (ins) return X(ins, { resumen: (d) => <InResumen v={ins} desk={d} onAll={irCat} />, tab: (d) => <InTab v={ins} desk={d} />, riel: <InRiel v={ins} />, barra: <InBarra v={ins} />, capas: <InHoja v={ins} />, pick: (id) => ins.abrir(id), hoy: deTd(ins.td, ins.linea || f.subsLinea) });
    if (fv) return X(fv, { resumen: (d) => <FeResumen v={fv} desk={d} onAll={irCat} />, tab: (d) => <FeTab v={fv} desk={d} />, riel: <FeRiel v={fv} />, barra: <FeBarra v={fv} />, capas: <><FeHoja v={fv} /><FeContacto v={fv} /></>, pick: (id) => fv.abrir(id), hoy: deTd(fv.td, f.hoy.sub || fv.linea) });
    if (iv) return X(iv, { resumen: (d) => <InmResumen v={iv} desk={d} onAll={irCat} />, tab: (d) => <InmTab v={iv} desk={d} />, riel: <InmRiel v={iv} />, barra: <InmBarra v={iv} />, capas: <InmHoja v={iv} />, pick: (id) => iv.abrir(id), hoy: deTd(iv.td, f.hoy.sub || iv.linea) });
    if (dv) return X(dv, { resumen: (d) => <DlResumen v={dv} desk={d} onAll={irCat} />, tab: (d) => <DlTab v={dv} desk={d} />, riel: <DlRiel v={dv} />, barra: <DlBarra v={dv} />, capas: <DlHoja v={dv} />, pick: (id) => dv.abrir(id), hoy: deTd(dv.td, f.hoy.sub || dv.linea) });
    if (me) return { resumen: (d) => <MeResumen v={me} desk={d} onAll={irCat} />, tab: (d) => <MeMenu v={me} desk={d} />, riel: <MeRiel v={me} onCta={irCat} />, barra: me.mio && me.tot.n ? <MeOrderBar v={me} /> : <MeBarra v={me} onCta={irCat} />, capas: <MeHoja v={me} />,
      top: me.top.slice(0, 3).map((x) => ({ id: x.id, name: me.nm(x.name), meta: me.precio(x).s, price: me.precio(x).l })), n: me.secs.reduce((a, g) => a + g.items.length, 0), pick: (id) => me.abrir(id), hoy: deRiel(me.riel) };
    if (mn) return { tab: (d) => (d ? <MenuDesk mn={mn} unaColumna={false} /> : <MenuMovil mn={mn} card />), riel: <PedidoTarjeta mn={mn} />,
      barra: !mn.has ? (
        <div data-screen-label="Ficha · barra de pedido" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/[.08] bg-paper/95 px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px] lg:hidden">
          <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Desde", "From")} ${(mn.m.desde / 100).toFixed(2)}</div><div className="mt-1 truncate font-mono text-[9px] font-bold tracking-[0.08em] text-open-text">{mn.etaCaps}</div></div>
          <Button variant="primary" size="lg" onClick={() => setTab("cat")}>{E2("Ordenar", "Order")}</Button>
        </div>) : null,
      capas: <><MenuCapas mn={mn} nombre={f.nombre} />{entrar ? <HojaEntrar es={es} destino={`/n/${f.id}/pagar`} onClose={() => setEntrar(false)} /> : null}</>,
      top: [], n: 1, pick: () => setTab("cat"), hoy: null };
    if (tienda && f.cat === "NEG-TIENDA" && (tienda.L.length || tienda.V.length)) return { tab: () => <TiendaTab L={tienda.L} V={tienda.V} mia={tienda.mia} auto={false} tienda horas={tienda.horas} plan={tienda.plan ?? null} negocio={f.id} es={es} c pop={tienda.pop ?? []} guardados={tienda.g} sesion={sesion} abrirInicial={productoInicial} />,
      riel: null, barra: null, capas: null, top: [], n: tienda.L.length + tienda.V.length, pick: () => setTab("cat"), hoy: null };
    return null;
  }, [ov, sa, pr, fi, vi, no, ins, fv, iv, dv, me, mn, tienda, entrar, es]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pestañas (solo con contenido) ──
  const sinLocal = !f.direccion && !f.zona;
  const dep = sv ? Math.max(0, ...sv.cp.gente.map((p) => p.dep)) : 0;
  // El nombre de cada pestaña va como palabra («Menú», «Servicios»): así lo lee el lector de pantalla; las mayúsculas del diseño las pone el estilo.
  const tc = (x: string) => x.charAt(0) + x.slice(1).toLowerCase();
  const tabs = [
    { id: "res", label: E2("Resumen", "Overview"), icon: "home" },
    ...((sv ? nItems : vende?.n) ? [{ id: "cat", label: tc(vende?.tabL ?? L(cfg.tab)), icon: cfg.icon }] : []),
    ...(verEquipo.length ? [{ id: "staff", label: tc(L(cfg.staffTab)), icon: "users" }] : []),
    { id: "rev", label: E2("Reseñas", "Reviews"), icon: "star" },
    ...(novedades?.posts.length ? [{ id: "nov", label: E2("Novedades", "Updates"), icon: "news" }] : []),
    ...(tienda && f.cat !== "NEG-TIENDA" && (tienda.L.length || tienda.V.length) ? [{ id: "shop", label: f.cat === "NEG-TRANS" ? E2("Renta", "Rent") : E2("Tienda", "Shop"), icon: "bag" }] : []),
    ...(rv ? [{ id: "rsv", label: E2("Reservar", "Reserve"), icon: "calendar" }] : []),
    ...(eventos.length ? [{ id: "evt", label: E2("Eventos", "Events"), icon: "ticket" }] : []),
    ...(jobs.length ? [{ id: "jobs", label: "Jobs", icon: "brief" }] : []),
    ...(sinLocal ? [] : [{ id: "hor", label: E2("Horario", "Hours"), icon: "clock" }]),
    ...(f.faqs.length || dep ? [{ id: "faq", label: E2("Antes de ir", "Before you go"), icon: "help" }] : []),
    ...(f.relacionados.length ? [{ id: "rel", label: E2("Relacionados", "Related"), icon: "store" }] : []),
  ];
  const ini = ({ svc: "cat", menu: "cat", reviews: "rev", ...(f.cat === "NEG-TIENDA" ? { shop: "cat" } : {}) } as Record<string, string>)[tabInicial ?? ""] ?? tabInicial ?? "res";
  const [tab, setTabS] = useState(tabs.some((x) => x.id === ini) ? ini : "res");
  const tabsRef = useRef<HTMLDivElement>(null);
  // 9t-2 · Desde Buscar (?tab=menu&plato=<id>): el plato abre su hoja una vez, ya hidratada la ficha, sobre la pestaña del menú. Si ahora no
  // se puede pedir, la ficha queda en el menú.
  const platoHecho = useRef(false);
  useEffect(() => {
    if (!platoInicial || !mn) return;
    const id = setTimeout(() => { if (platoHecho.current) return; platoHecho.current = true; mn.abrir(platoInicial, window.innerWidth >= 1024); }, 60);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setTab = (id: string) => {
    setTabS(id);
    // La pestaña activa siempre se ve: si ya bajaste más allá de las pestañas, la página sube hasta ellas.
    const el = tabsRef.current;
    if (el) { const top = el.getBoundingClientRect().top + window.scrollY - CAB_MOVIL; if (window.scrollY > top) window.scrollTo({ top }); }
  };

  // ── Acciones del encabezado ──
  const avisar = (m: string) => { setAviso(m); setTimeout(() => setAviso(null), 2200); };
  const llamar = f.telefono ? () => { void registrarToque(f.id, "call", "ficha"); location.href = `tel:${f.telefono}`; } : null;
  const escribir = f.mensajes ? () => { void registrarToque(f.id, "message", "ficha"); router.push(`/cuenta/mensajes/${f.id}`); } : null;
  const llegar = !porContrato && f.direccion && f.lat != null && f.lng != null ? () => { void registrarToque(f.id, "directions", "ficha"); abrirComoLlegar({ lat: f.lat!, lng: f.lng! }); } : null;
  const compartir = async () => { void registrarToque(f.id, "share", "ficha"); if ((await compartirNativo({ titulo: f.nombre, url: location.href })) === "copiado") avisar(E2("Enlace copiado", "Link copied")); };
  const guardar = async () => {
    const antes = guardado; setGuardado(!antes);
    const r = await guardarNegocio(f.id);
    if (r.ok) { setGuardado(!!r.on); avisar(r.on ? E2("Guardado en tus negocios", "Saved to your places") : E2("Quitado de guardados", "Removed from saved")); return; }
    setGuardado(antes);
    if ("entrar" in r && r.entrar) router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`);
  };
  const verFotos = () => router.push(`/n/${f.id}/fotos`);

  // ── Encabezado (una sola vez el estado) ──
  const abierto = f.abierto, stFg = abierto ? "var(--tl-open-text)" : "var(--tl-danger)", stDot = abierto ? "var(--tl-open)" : "var(--tl-danger)";
  const resto = f.estadoResto.replace(/^·\s*/, ""), restoC = resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : "";
  const calle = (f.direccion ?? f.zona ?? "").split(",")[0]!.toUpperCase();
  const n = resenas?.n ?? 0, avg = resenas?.avg ?? null;
  const metaL = [n >= 5 && avg != null ? `★ ${avg.toFixed(1)} · ${n} ${E2("RESEÑAS", "REVIEWS")}` : n > 0 ? `${n} ${n === 1 ? E2("RESEÑA", "REVIEW") : E2("RESEÑAS", "REVIEWS")}` : E2("NUEVO EN TO'LATINO", "NEW ON TO'LATINO"),
    f.dist !== "—" ? f.dist.toUpperCase() : null, calle || null].filter(Boolean) as string[];

  // ── La tarjeta de hoy: lo que importa sin repetir el estado ni la barra (Belleza: cómo confirma, el depósito, el pago) ──
  const hoy = useMemo(() => {
    if (porContrato) return { eyebrow: f.hoy.eyebrow, title: f.hoy.title, cols: [] as { k: string; v: string }[] };
    if (!sv) return { eyebrow: f.hoy.eyebrow, title: vende?.hoy?.title || f.hoy.sub || f.subsLinea || L(cfg.title), cols: vende?.hoy?.cols ?? f.hoy.cols };
    const cp = sv.cp, todosAuto = cp.gente.length > 0 && cp.gente.every((p) => p.auto), resp = Math.min(...cp.gente.map((p) => p.resp).concat(cp.pol.resp));
    const title = !cp.can ? (cp.off === "apagado" ? E2("Sin cita: llegas y esperas turno", "Walk-in: come in and wait your turn") : E2("Pide tu hora por teléfono", "Call for your time"))
      : todosAuto ? E2("Confirman al instante", "Instant confirmation") : E2(`Responden en ~${resp >= 60 ? `${Math.round(resp / 60)} h` : `${resp} min`}`, `Reply in ~${resp >= 60 ? `${Math.round(resp / 60)} h` : `${resp} min`}`);
    const deps = [...new Set(cp.gente.map((p) => p.dep))];
    const cols = [
      ...(cp.can ? [{ k: E2("DEPÓSITO", "DEPOSIT"), v: deps.length === 1 ? (deps[0] ? dinero(deps[0]) : E2("No pide", "None")) : `${E2("Hasta ", "Up to ")}${dinero(Math.max(...deps))}` }] : []),
      ...(verEquipo.length ? [{ k: L(cfg.staffTab), v: `${verEquipo.length} ${verEquipo.length === 1 ? sv.w.uno : sv.w.varios}` }] : []),
      { k: E2("PAGO", "PAYMENT"), v: E2("En el local", "In store") },
    ].slice(0, 3);
    return { eyebrow: f.hoy.eyebrow, title, cols };
  }, [sv, f, es]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── La barra de abajo (una sola acción) y la tarjeta de la derecha ──
  const primera = useMemo(() => {
    if (!sv) return null;
    let mejor: { i: number; m: number; who: string } | null = null;
    for (const p of sv.cp.gente) { const x = sv.prx(p.id); if (x && (!mejor || x.i < mejor.i || (x.i === mejor.i && x.m < mejor.m))) mejor = { ...x, who: p.corto }; }
    return mejor;
  }, [sv]);
  const barra = sv && sv.cp.can ? {
    title: sv.desde ? `${E2("Desde", "From")} ${dinero(sv.desde)}` : L(cfg.title),
    sub: primera ? `${E2("PRÓXIMA HORA", "NEXT OPENING")} · ${sv.nxL(primera)}${sv.silla || gente.length > 1 ? ` ${E2("CON", "WITH")} ${primera.who}` : ""}`.toUpperCase() : E2("PRÓXIMA HORA · MAÑANA", "NEXT OPENING · TOMORROW"),
    cta: L(cfg.cta), go: () => abrirReserva(),
  } : llamar ? { title: hoy.title, sub: (f.telefono ?? "").toUpperCase(), cta: E2("Llamar", "Call"), go: llamar } : null;

  llamarR.current = llamar ?? (() => undefined); escribirR.current = escribir ?? (() => undefined); llegarR.current = llegar ?? (() => undefined);

  const popular: (Fila & { k?: string })[] = sv ? grupos.slice(0, 3).map((g) => g.items[0]!).filter(Boolean) : vende?.top ?? [];
  const nCat = sv ? nItems : vende?.n ?? 0;
  const verRes = () => setTab("rev");
  const pick = (id: string, k?: string) => (sv ? abrirReserva({ svc: id }) : vende?.pick(id, k));

  /* ── Bloques que comparten teléfono y computadora ── */
  const filaSvc = (x: Fila & { k?: string }, on = false) => <ServiceRow key={x.id} name={x.name} meta={x.meta} price={x.price} selected={on} onClick={() => pick(x.id, x.k)} />;
  const oferta = f.oferta ? (
    <button type="button" onClick={() => setTab(novedades?.posts.length ? "nov" : nItems ? "cat" : "res")} className="flex w-full items-center gap-3 rounded-[17px] bg-action/[.07] px-4 py-3.5 text-left">
      <Icon name="bolt" size={17} color="var(--tl-action)" /><span className="min-w-0 flex-1 text-[13.5px] font-bold leading-[1.45] text-action-hover">{f.oferta}</span><Icon name="chevronRight" size={16} color="var(--tl-action)" />
    </button>
  ) : null;
  const dueno = (desk: boolean) => f.quien ? <div className="grid"><OwnerCard {...f.quien} desktop={desk} teamCta={verEquipo.length ? `${E2("Ver", "See")} ${L(cfg.staffTitle).toLowerCase()}` : ""} onTeam={verEquipo.length ? () => (desk ? ir("staff") : setTab("staff")) : undefined} /></div> : null;
  const miCita = sv?.mia ? (
    <button type="button" onClick={sv.mia.onClick} data-screen-label="Ficha · tu cita" className="flex w-full items-center gap-3 rounded-[17px] border border-line bg-white px-4 py-3.5 text-left">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/60">{sv.mia.k}</span><Tag tone={sv.mia.tone}>{sv.mia.tag}</Tag></div>
        <div className="mt-1.5 text-[14px] font-bold leading-[1.35]">{sv.mia.t}</div><div className="mt-0.5 text-[12px] font-medium text-ink/60">{sv.mia.s}</div></div>
      <Icon name="chevronRight" size={16} color="rgba(11,14,18,.6)" />
    </button>
  ) : null;
  const hechos = rs ? aspectos(rs).slice(0, 3) : [];
  // Lo que la ficha de siempre ya tenía y no se pierde: «¿Puede hacerlo por ley?» (Profesionales) y «¿Es tu negocio?» (sin dueño en To'Latino).
  const ley = f.ley ? (
    <button type="button" data-screen-label="Resumen · puede hacerlo por ley" disabled={!f.ley.enlace} onClick={() => router.push(`/n/${f.id}/licencia`)} className="flex w-full items-center gap-3 rounded-[17px] border border-line bg-white px-3.5 py-[13px] text-left">
      <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-ink"><Icon name={f.ley.enlace ? "verified" : "ban"} size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/60">{f.ley.enlace ? t.leyK : t.leyNoK}</span>
        <span className="mt-1 block text-[14px] font-bold leading-[1.3]">{f.ley.titulo}</span>{f.ley.texto ? <span className="mt-0.5 block text-[12px] font-medium leading-[1.45] text-ink/60">{f.ley.texto}</span> : null}</span>
      {f.ley.enlace ? <span className="flex-none text-[12.5px] font-bold text-action">{t.leyCta}</span> : null}
    </button>
  ) : null;
  const esTuyo = !f.mensajes ? (
    <button type="button" data-es-tuyo={f.id} onClick={() => router.push(`/recuperar/${f.id}`)} className="flex w-full items-center gap-3 rounded-[17px] border border-ink/[.08] bg-paper px-3.5 py-[13px] text-left">
      <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-action/10"><Icon name="store" size={19} color="var(--tl-action)" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{E2("¿Es tu negocio?", "Is this your business?")}</span>
        <span className="mt-1 block text-[12px] font-medium leading-[1.45] text-ink/60">{E2("Reclámalo gratis: confirmas que es tuyo y lo manejas desde tu panel.", "Claim it for free: confirm it is yours and run it from your dashboard.")}</span></span>
      <Icon name="chevronRight" size={16} color="rgba(11,14,18,.35)" />
    </button>
  ) : null;
  const resumenResenas = (desk: boolean) => !rs ? null : rs.r.n < 5 ? <ResResumen v={rs} desk={desk} onAll={verRes} /> : (
    <div className="flex flex-col gap-2.5" data-screen-label="Resumen · reseñas">
      <SectionHeader title={E2("Reseñas", "Reviews")} action={E2(`Ver las ${rs.r.n}`, `See all ${rs.r.n}`)} onAction={verRes} />
      <div className="flex items-center gap-3.5 rounded-[17px] bg-paper px-4 py-3.5">
        <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">{rs.r.avg?.toFixed(1)}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          {hechos.length ? hechos.map((a) => (
            <div key={a.k} className="flex items-center gap-[7px] text-[12px] font-bold text-open-text"><Icon name={a.ic} size={13} color="var(--tl-open-text)" /><span className="min-w-0 flex-1 truncate">{a.k.charAt(0) + a.k.slice(1).toLowerCase()}</span><span className="font-mono text-[11.5px] font-extrabold text-ink">{a.v}</span></div>
          )) : <div className="font-mono text-[10px] font-bold tracking-[0.08em] text-ink/60">{rs.r.n} {E2("RESEÑAS", "REVIEWS")}{rs.r.ver ? ` · ${rs.r.ver} ${E2("VERIFICADAS", "VERIFIED")}` : ""}</div>}
        </div>
      </div>
      {rs.r.destacadas.slice(0, 2).map((c) => <div key={c.id} className="grid"><ReviewCard {...rs.card(c, { summary: true })} /></div>)}
    </div>
  );
  const horario = sinLocal ? null : (
    <>
      <div className="grid"><HoursPro data={f.horario.data} dateLabel={f.horario.dateLabel} status={f.horario.status} statusColor={stFg} nextLabel={f.horario.nextLabel} weekOpen
        nowLabel={t.now} changesLabel={t.changes} weekLabel={t.week} /></div>
      <div className="overflow-hidden rounded-[17px] border border-line bg-white">
        {f.lat != null && f.lng != null ? <MiniMapa centro={[f.lat, f.lng]} zona={!f.direccion} z={f.direccion ? 16 : 14} etiqueta={(f.direccion ? t.map : t.mapZone)?.toUpperCase() ?? ""} al={llegar ?? undefined} />
          : <Placeholder tone="mint" height={150} />}
        <div className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
          <div><div className="font-display text-[16px] font-extrabold leading-[1.25] tracking-[-0.025em]">{f.direccion ?? f.zona}</div><div className="mt-[3px] text-[12.5px] font-medium leading-[1.5] text-ink/60">{f.direccionMeta}</div></div>
          {llegar ? <div className="grid"><Button variant="secondary" size="md" icon="pin" block onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button></div> : null}
          {f.amen.length > 0 && (
            <div className="border-t border-ink/[.07] pt-3">
              <div className="mb-[9px] font-mono text-[10px] font-bold tracking-[0.16em] text-ink/60">{f.amenK}</div>
              <div className="flex flex-wrap gap-1.5">{f.amen.map((a) => <Chip key={a.l} variant="feature"><Icon name={a.icon} size={13} />{a.l}</Chip>)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
  const depRows = sv && dep ? [
    { label: E2("Llegas a tu cita", "You show up"), value: E2("Se descuenta", "Taken off the total"), color: "var(--tl-open-text)" },
    { label: E2(`El negocio rechaza o no responde en ${sv.cp.pol.exp} h`, `The business declines or does not reply in ${sv.cp.pol.exp} h`), value: E2("Se libera", "Released"), color: "var(--tl-open-text)" },
    { label: E2(`Cancelas con ${sv.cp.pol.cxh} h o más`, `You cancel ${sv.cp.pol.cxh} h or more ahead`), value: E2("Se libera", "Released"), color: "var(--tl-open-text)" },
    { label: E2(`Cancelas con menos de ${sv.cp.pol.cxh} h o no llegas`, `You cancel under ${sv.cp.pol.cxh} h or do not show`), value: `${E2("Se cobra", "Charged")} ${dinero(dep)}`, color: "var(--tl-danger)" },
  ] : [];
  const antes = (
    <>
      {depRows.length ? <div className="grid"><DepositOutcomes title={E2(`Tu depósito de ${dinero(dep)}`, `Your ${dinero(dep)} deposit`)} rows={depRows}
        foot={E2("Se retiene en tu tarjeta; no se cobra hasta que pase algo de esta lista.", "Held on your card; nothing is charged until something on this list happens.")} /></div> : null}
      {f.faqs.length ? (
        <div className="overflow-hidden rounded-[17px] border border-line bg-white">
          {f.faqs.map((q, i) => (
            <div key={i} className={i ? "border-t border-ink/[.07]" : ""}>
              <button type="button" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)} className="flex min-h-11 w-full items-center gap-3 p-[15px] text-left">
                <span className="flex-1 text-[13.5px] font-bold leading-[1.4]">{q.q}</span>
                <span className="grid transition-transform" style={{ transform: faq === i ? "rotate(180deg)" : "none" }}><Icon name="chevronDown" size={16} color="rgba(11,14,18,.6)" /></span>
              </button>
              {faq === i ? <div className="text-pretty px-[15px] pb-[15px] text-[13px] leading-[1.62] text-ink/70">{q.a}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
  const relacionados = f.relacionados.map((r) => (
    <div key={r.id} className="grid"><BusinessRow name={r.nombre} meta={r.meta} verified={r.verificado} slot={E2("Ver", "See")} image={r.foto ? `url(${r.foto})` : undefined} onClick={() => router.push(`/n/${r.id}`)} /></div>
  ));
  const chips = [{ id: "all", label: E2("Todos", "All") }, ...grupos.map((g, i) => ({ id: `g${i}`, label: g.name }))];
  const gruposF = grupos.map((g, i) => ({ ...g, k: `g${i}` })).filter((g) => catF === "all" || catF === g.k);
  const fotoGente = (p: Persona, h: number) => p.foto ? <div style={{ height: h, background: `center/cover url(${p.foto})` }} /> : <Placeholder height={h} />;

  // Una sola copia de la página: el servidor manda la del aparato que estima (lib/ancho: el último ancho de este navegador o el tipo de
  // aparato) y, ya en el aparato, se corrige con el ancho real. Así las piezas con estado propio (la tienda, el carrito, la hoja) no existen dos veces.
  /* Un solo árbol por aparato: el ancho sale de useAncho() (la estimación del servidor, después la medida; guarda la cookie tl_ancho). */
  const modo: "m" | "d" = useAncho() >= 1024 ? "d" : "m";
  // ── Computadora: secciones, pestañas que llevan a cada una y la tarjeta pegada a la derecha ──
  const [activa, setActiva] = useState("res");
  const [pegada, setPegada] = useState(false);
  const [flechas, setFlechas] = useState({ l: false, r: false });
  const tiraRef = useRef<HTMLDivElement>(null);
  const tira = () => tiraRef.current ? ([...tiraRef.current.querySelectorAll("div")].find((x) => getComputedStyle(x).overflowX === "auto") ?? null) : null;
  const ir = (id: string) => { const el = document.getElementById(`sec-${id}`); setActiva(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - CAB_DESK - 64, behavior: "smooth" }); };
  const mirar = useCallback(() => {
    if (window.innerWidth < 1024) return;
    let a = "res";
    for (const x of tabs) { const el = document.getElementById(`sec-${x.id}`); if (el && el.getBoundingClientRect().top < CAB_DESK + 120) a = x.id; }
    setActiva(a);
    const tb = tiraRef.current; setPegada(!!tb && tb.getBoundingClientRect().top <= CAB_DESK + 1);
    const st = tira(); if (st) setFlechas({ l: st.scrollLeft > 4, r: st.scrollLeft + st.clientWidth < st.scrollWidth - 4 });
  }, [tabs.map((x) => x.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  // Llegas con ?tab=… en la computadora: la página baja hasta esa sección.
  useEffect(() => { if (window.innerWidth >= 1024 && ini !== "res" && document.getElementById(`sec-${ini}`)) requestAnimationFrame(() => ir(ini)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    mirar(); window.addEventListener("scroll", mirar, { passive: true }); window.addEventListener("resize", mirar);
    const st = tira(); st?.addEventListener("scroll", mirar, { passive: true });
    return () => { window.removeEventListener("scroll", mirar); window.removeEventListener("resize", mirar); st?.removeEventListener("scroll", mirar); };
  }, [mirar]);
  const seccion = (id: string, titulo: ReactNode, cuerpo: ReactNode, extra?: ReactNode) => (
    <section id={`sec-${id}`} className="flex scroll-mt-[200px] flex-col gap-[18px]">
      {titulo ? <div className="flex items-baseline justify-between gap-4"><h2 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.035em]">{titulo}</h2>{extra}</div> : null}
      {cuerpo}
    </section>
  );

  return (
    <div data-pantalla="APP-NEG-LISTING" data-ficha="nueva" className="bg-white">
      {/* ═════════ Teléfono ═════════ */}
      {modo === "m" ? (
      <div className="pb-[116px] lg:hidden" data-screen-label="App · Ficha">
        <div className="relative h-[330px]">
          {f.video ? <div className="absolute inset-0 overflow-hidden" data-portada-video=""><VideoPortada src={f.video.src} poster={f.video.poster} es={es} chipPos={{ left: 20, bottom: 16 }} /></div> : (
          <button type="button" aria-label={t.photosAll} onClick={verFotos} className="absolute inset-0 block">{f.hero ? <span className="block size-full bg-photo-bg-2" style={{ background: `center/cover url(${f.hero})` }} /> : <Placeholder height="100%" />}</button>
          )}
          <div className="absolute inset-x-5 top-4 flex gap-2">
            <IconButton icon="chevronLeft" size={40} label={t.back} onClick={() => router.back()} />
            <div className="flex-1" />
            <IconButton icon="share" size={40} label={t.share} onClick={compartir} />
            <IconButton icon="heart" size={40} label={guardado ? t.saved : t.save} active={guardado} onClick={guardar} />
          </div>
          {f.nFotos > 0 ? (
            <button type="button" onClick={verFotos} className="absolute bottom-4 right-5 flex min-h-11 items-center gap-1.5 rounded-[10px] bg-white px-2.5 py-[7px] font-mono text-[10.5px] font-bold tracking-[0.08em]">
              <Icon name="image" size={14} />{f.nFotos} {E2("FOTOS", "PHOTOS")}
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-[18px] pt-5">
          <div className="flex gap-1.5"><Chip variant="pro" style={CHIP_SM}>PRO</Chip>{f.verificado ? <Chip variant="verified" style={CHIP_SM}>{E2("Sello To'Latino", "To'Latino seal")}</Chip> : null}</div>
          {f.subsLinea ? <div className="font-mono text-[10px] font-bold tracking-[0.12em] text-ink/60">{f.subsLinea.toUpperCase()}</div> : null}
          <h1 className="text-balance font-display text-[29px] font-extrabold leading-[1.05] tracking-[-0.045em]">{f.nombre}</h1>
          <div className="font-mono text-[10.5px] font-bold tracking-[0.07em] text-ink/60">{metaL.map((x, i) => <span key={i}>{i ? " · " : ""}{x.startsWith("★") ? <><span className="text-[var(--tl-pro)]">★</span>{x.slice(1)}</> : x}</span>)}</div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink/70" data-estado={abierto ? "abierto" : "cerrado"}>
            <span className="size-2 flex-none rounded-full" style={{ background: stDot }} /><span className="font-extrabold" style={{ color: stFg }}>{f.estadoCorto}</span>{restoC ? <span>{restoC}</span> : null}
          </div>
          {[llamar, escribir, llegar].some(Boolean) ? (
            /* 19 nov · Antes, tres columnas iguales: «Cómo llegar» (122 px) no cabía en su tercio (111 a 390) y se salía del margen; con letra
               grande en el iPhone SE la página se movía de lado. Ahora cada botón toma lo que dice y lo que sobra se reparte; si no caben los
               tres, el último baja a otra fila (nunca se sale). Guardián botonesQueCaben. */
            <div data-pieza="acciones-ficha" className="mt-1.5 flex flex-wrap gap-2">
              {llamar ? <div className="grid flex-[1_1_auto]"><Button variant="secondary" size="sm" icon="phone" block onClick={llamar}>{E2("Llamar", "Call")}</Button></div> : null}
              {escribir ? <div className="grid flex-[1_1_auto]"><Button variant="secondary" size="sm" icon="chat" block onClick={escribir}>{E2("Escribir", "Message")}</Button></div> : null}
              {llegar ? <div className="grid flex-[1_1_auto]"><Button variant="secondary" size="sm" icon="pin" block onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button></div> : null}
            </div>
          ) : null}
        </div>
        <div ref={tabsRef} className="sticky z-20 bg-white [&_[role=tab]]:uppercase" style={{ top: CAB_MOVIL }}><Tabs items={tabs} active={tab} onChange={setTab} /></div>
        <div className="min-h-[640px]">
          {tab === "res" && (
            <div className="flex flex-col gap-6 px-5 pt-5" data-screen-label="Ficha · resumen">
              <div className="flex flex-col gap-3">
                {miCita}
                <div className="grid"><TodayCard eyebrow={hoy.eyebrow} title={hoy.title} cols={hoy.cols} /></div>
                {oferta}
              </div>
              {dueno(false)}
              {ley}
              {!sv && mn ? <MenuResumen mn={mn} desk={false} onAll={() => setTab("cat")} /> : null}
              {rv ? <RsvRapida v={rv} onMas={(p, i, h) => { if (p) { rv.setP(p); if (i != null) rv.setI(i); if (h != null) rv.setSel(h); } setTab("rsv"); }} /> : null}
              {vende?.resumen ? vende.resumen(false) : popular.length ? (
                <div className="flex flex-col gap-2.5">
                  <SectionHeader title={E2("Lo más pedido", "Most booked")} action={nCat > popular.length && vende?.n !== 1 ? `${E2("Ver", "See")} ${nCat}` : undefined} onAction={() => setTab("cat")} />
                  {popular.map((x) => filaSvc(x))}
                </div>
              ) : null}
              {verEquipo.length ? (
                <div className="flex flex-col gap-2.5" data-pieza="riel-equipo">
                  <SectionHeader title={L(cfg.staffTitle)} action={E2("Ver todos", "See all")} onAction={() => setTab("staff")} />
                  <div className="hs -mx-5 flex gap-2.5 overflow-x-auto px-5">
                    {verEquipo.map((p) => (
                      <button key={p.id} type="button" onClick={() => (staffBook ? abrirReserva({ who: p.id }) : setTab("staff"))} className="w-[136px] flex-none overflow-hidden rounded-[17px] border border-ink/[.08] bg-white text-left">
                        {fotoGente(p, 120)}
                        <div className="px-[11px] pb-3 pt-2.5"><div className="font-display text-[14.5px] font-extrabold leading-[1.2] tracking-[-0.02em]">{p.short}</div><div className="mt-1 truncate text-[11.5px] font-semibold leading-[1.35] text-ink/60">{p.role}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {resumenResenas(false)}
              {esTuyo}
            </div>
          )}
          {tab === "cat" && !sv && vende ? <div className="pb-6">{vende.tab(false)}</div> : null}
          {tab === "cat" && sv && (
            <div className="flex flex-col gap-3.5 pt-4" data-screen-label="Ficha · servicios">
              {miCita ? <div className="px-5">{miCita}</div> : null}
              <div className="hs flex gap-2 overflow-x-auto px-5">{chips.map((c) => <Chip key={c.id} variant={catF === c.id ? "selected" : "filter"} onClick={() => setCatF(c.id)}>{c.label}</Chip>)}</div>
              {gruposF.map((g) => (
                <div key={g.k} className="flex flex-col gap-2 px-5">
                  <div className="pt-1.5 font-mono text-[10px] font-bold tracking-[0.2em] text-ink/60">{g.label}</div>
                  {g.items.map((x) => filaSvc(x))}
                </div>
              ))}
            </div>
          )}
          {tab === "staff" && verEquipo.length > 0 && (
            <div className="flex flex-col gap-3 px-5 pt-[18px]" data-screen-label="Ficha · equipo">
              {verEquipo.map((p) => (
                <div key={p.id} className="grid grid-cols-[84px_minmax(0,1fr)] gap-[13px] rounded-[17px] border border-ink/[.08] bg-white p-3">
                  <div className="overflow-hidden rounded-[13px]">{fotoGente(p, 96)}</div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-center gap-[7px]"><span className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.025em]">{p.name}</span>{p.owner ? <Tag tone="ink">{E2("DUEÑO", "OWNER")}</Tag> : null}</div>
                    <div className="text-[12.5px] font-medium leading-[1.45] text-ink/60">{p.role}</div>
                    {p.spec ? <div className="font-mono text-[9.5px] font-bold tracking-[0.06em] text-ink/60">{p.spec}</div> : null}
                    {staffBook || p.silla != null ? <div className="mt-0.5 flex justify-end gap-2">
                      {p.silla != null && sv ? <Button variant="secondary" size="sm" onClick={() => sv.verSilla(p.silla!)}>{E2("Ver su página", "See profile")}</Button> : null}
                      {staffBook ? <Button variant="soft" size="sm" onClick={() => abrirReserva({ who: p.id })}>{L(cfg.cta)}</Button> : null}
                    </div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "rev" && rs && <div className="pb-6"><ResTab v={rs} desk={false} onMenu={() => setTab("cat")} /></div>}
          {tab === "nov" && novedades && <div className="pb-6"><NovTab v={novedades} logo={f.logo ?? null} sesion={sesion} es={es} onHoras={() => setTab("hor")} onItem={(id) => { setTab("cat"); if (id && me) setTimeout(() => me.abrir(id), 60); }} /></div>}
          {tab === "shop" && tienda ? <div className="pb-6"><TiendaTab L={tienda.L} V={tienda.V} mia={tienda.mia} auto={f.cat === "NEG-AUTO"} horas={tienda.horas} plan={tienda.plan ?? null} negocio={f.id} es={es} guardados={tienda.g} sesion={sesion} abrirInicial={productoInicial} /></div> : null}
          {tab === "rsv" && rv ? <div className="pb-6"><RsvTab v={rv} desk={false} /></div> : null}
          {tab === "evt" && <EventosTab eventos={eventos} es={es} />}
          {tab === "jobs" && <div className="pb-6"><JobsTab jobs={jobs} negocio={f.id} sesion={sesion} es={es} /></div>}
          {tab === "hor" && <div className="flex flex-col gap-4 px-5 pt-[18px]" data-screen-label="Ficha · horario">{horario}</div>}
          {tab === "faq" && <div className="flex flex-col gap-4 px-5 pt-[18px]" data-screen-label="Ficha · antes de ir">{antes}</div>}
          {tab === "rel" && <div className="flex flex-col gap-2.5 px-5 pt-[18px]" data-screen-label="Ficha · relacionados">{relacionados}</div>}
        </div>
        {!sv && vende && tab !== "cat" && tab !== "shop" && tab !== "rsv" ? vende.barra : null}
        {tab === "rsv" && rv ? <RsvBarra v={rv} /> : null}
        {sv && barra && !bk && !sv.hoja ? (
          <div data-screen-label="Ficha · barra" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/[.08] bg-paper/95 px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px]">
            <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-[1.1] tracking-[-0.03em]">{barra.title}</div><div className="mt-1 truncate font-mono text-[9px] font-bold tracking-[0.08em] text-open-text">{barra.sub}</div></div>
            <Button variant="primary" size="lg" onClick={barra.go}>{barra.cta}</Button>
          </div>
        ) : null}
        {bk && sv ? <HojaCita v={sv} bk={bk} setBk={setBk} cfg={cfg} es={es} /> : null}
      </div>) : null}

      {/* ═════════ Computadora ═════════ */}
      {modo === "d" ? (
      <div className="mx-auto hidden max-w-[1240px] px-8 pb-14 lg:block" data-screen-label="APP-NEG-LISTING · desktop">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 pt-[18px] text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} />{E2("Volver", "Back")}</button>
        <div className="flex flex-wrap items-center gap-2 pb-4 pt-2.5 font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink/60">
          {[f.subsLinea.toUpperCase(), `${f.ciudad}, PA`].filter(Boolean).map((x, i) => <span key={i}>{i ? "· " : ""}{x}</span>)}
        </div>
        <div className="relative grid h-[448px] grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] grid-rows-2 gap-2 overflow-hidden rounded-[22px]">
          {f.video ? <div className="relative row-span-2 min-w-0 overflow-hidden" data-portada-video=""><VideoPortada src={f.video.src} poster={f.video.poster} es={es} desk onClick={verFotos} /></div> : (
          <button type="button" aria-label={t.photosAll} onClick={verFotos} className="row-span-2 min-w-0">{f.hero ? <span className="block size-full" style={{ background: `center/cover url(${f.hero})` }} /> : <Placeholder height="100%" />}</button>
          )}
          {[1, 2, 3, 4].map((k) => <button key={k} type="button" aria-label={t.photosAll} onClick={verFotos} className="min-w-0">{f.fotos[k] ? <span className="block size-full" style={{ background: `center/cover url(${f.fotos[k]})` }} /> : <Placeholder height="100%" />}</button>)}
          {f.nFotos > 0 ? <button type="button" onClick={verFotos} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-[13px] bg-white px-3.5 py-2.5 text-[13px] font-bold shadow-[var(--shadow-float)]"><Icon name="image" size={16} />{E2(`Ver las ${f.nFotos} fotos`, `See all ${f.nFotos} photos`)}</button> : null}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6 pb-[22px] pt-[26px]">
          <div className="min-w-0 flex-[1_1_420px]">
            <div className="mb-3.5 flex flex-wrap gap-2"><Chip variant="pro">PRO</Chip>{f.verificado ? <Chip variant="verified">{E2("Sello To'Latino", "To'Latino seal")}</Chip> : null}</div>
            <h1 className="text-balance font-display text-[clamp(32px,4.2vw,48px)] font-extrabold leading-[1.02] tracking-[-0.045em]">{f.nombre}</h1>
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11.5px] font-bold tracking-[0.08em] text-ink/60">{metaL.map((x, i) => <span key={i}>{i ? "· " : ""}{x.startsWith("★") ? <><span className="text-[var(--tl-pro)]">★</span>{x.slice(1)}</> : x}</span>)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[14px] font-semibold text-ink/70"><span className="size-[9px] flex-none rounded-full" style={{ background: stDot }} /><span className="font-extrabold" style={{ color: stFg }}>{f.estadoCorto}</span>{restoC ? <span>{restoC}</span> : null}</div>
          </div>
          <div className="flex flex-none gap-2">
            <IconButton icon="heart" size={50} label={guardado ? t.saved : t.save} active={guardado} onClick={guardar} />
            <IconButton icon="share" size={50} label={t.share} onClick={compartir} />
            {llamar ? <IconButton icon="phone" size={50} label={E2("Llamar", "Call")} onClick={llamar} /> : null}
          </div>
        </div>
        <div ref={tiraRef} className="sticky z-20 [&_[role=tab]]:uppercase" style={{ top: CAB_DESK }}>
          <DesktopTabs items={tabs} active={activa} onChange={ir} aside={pegada ? { label: `${f.estadoCorto} · ${resto}`.toUpperCase().slice(0, 40), dot: stDot } : null} />
          {flechas.l ? <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[76px] items-center bg-[linear-gradient(90deg,#fff_55%,rgba(255,255,255,0))]"><span className="pointer-events-auto"><IconButton icon="chevronLeft" size={34} label={E2("Anteriores", "Previous")} onClick={() => tira()?.scrollBy({ left: -320, behavior: "smooth" })} /></span></div> : null}
          {flechas.r ? <div className="pointer-events-none absolute inset-y-0 right-[420px] flex w-[76px] items-center justify-end bg-[linear-gradient(270deg,#fff_55%,rgba(255,255,255,0))]"><span className="pointer-events-auto"><IconButton icon="chevronRight" size={34} label={E2("Más", "More")} onClick={() => tira()?.scrollBy({ left: 320, behavior: "smooth" })} /></span></div> : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_372px] items-start gap-12 pt-8">
          <div className="flex min-w-0 flex-col gap-16">
            {seccion("res", null, <div className="flex flex-col gap-4">{miCita}{dueno(true)}<div className="grid"><TodayCard desktop eyebrow={hoy.eyebrow} title={hoy.title} cols={hoy.cols} /></div>{oferta}{rv ? <RsvRapida v={rv} onMas={(p, i, h) => { if (p) { rv.setP(p); if (i != null) rv.setI(i); if (h != null) rv.setSel(h); } ir("rsv"); }} /> : null}{ley}{vende?.resumen ? vende.resumen(true) : null}{esTuyo}</div>)}
            {!sv && vende ? seccion("cat", vende.tabL ?? L(cfg.title), <div>{vende.tab(true)}</div>) : null}
            {sv && nItems ? seccion("cat", L(cfg.title), (
              <div data-screen-label="Ficha · servicios · desktop" className="flex flex-col gap-[18px]">
                <div className="hs flex gap-2 overflow-x-auto">{chips.map((c) => <Chip key={c.id} variant={catF === c.id ? "selected" : "filter"} onClick={() => setCatF(c.id)}>{c.label}</Chip>)}</div>
                {gruposF.map((g) => (
                  <div key={g.k} className="flex flex-col gap-2.5">
                    <div className="pt-1.5 font-mono text-[10px] font-bold tracking-[0.2em] text-ink/60">{g.label}</div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5">{g.items.map((x) => <div key={x.id} className="flex min-w-0 flex-col">{filaSvc(x, bk?.svc === x.id)}</div>)}</div>
                  </div>
                ))}
              </div>
            )) : null}
            {verEquipo.length ? seccion("staff", L(cfg.staffTitle), (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
                {verEquipo.map((p) => (
                  <div key={p.id} className="flex flex-col overflow-hidden rounded-[20px] border bg-white" style={{ border: dsk.who === p.id ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.08)" }}>
                    <div className="relative">{fotoGente(p, 180)}{p.owner ? <span className="absolute left-3 top-3"><Tag tone="ink">{E2("DUEÑO", "OWNER")}</Tag></span> : null}</div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="font-display text-[18px] font-extrabold leading-[1.15] tracking-[-0.03em]">{p.name}</div>
                      <div className="text-[13px] font-medium leading-[1.45] text-ink/60">{p.role}</div>
                      {p.spec ? <div className="font-mono text-[10px] font-bold tracking-[0.08em] text-ink/60">{p.spec}</div> : null}
                      {p.silla != null && sv ? <><div className="flex-1" /><div className="grid"><Button variant="secondary" size="md" icon="store" block onClick={() => sv.verSilla(p.silla!)}>{E2("Ver su página", "See profile")}</Button></div></> : null}
                      {staffBook ? <><div className="flex-1" /><div className="grid"><Button variant={dsk.who === p.id ? "primary" : "soft"} size="md" block onClick={() => elegirDesk({ who: p.id })}>{dsk.who === p.id ? E2("Elegido", "Selected") : `${L(cfg.cta)} ${E2("con", "with")} ${p.short}`}</Button></div></> : null}
                    </div>
                  </div>
                ))}
              </div>
            )) : null}
            {rs ? seccion("rev", E2("Reseñas", "Reviews"), <ResTab v={rs} desk onMenu={() => ir("cat")} />, <button type="button" onClick={rs.escribir} className="inline-flex min-h-11 items-center text-[13.5px] font-bold text-action">{rs.r.tengo ? E2("Ver tu reseña", "See your review") : E2("Escribir reseña", "Write a review")}</button>) : null}
            {novedades?.posts.length ? seccion("nov", E2("Novedades", "Updates"), <div className="max-w-[680px]"><NovTab v={novedades} logo={f.logo ?? null} sesion={sesion} es={es} onHoras={() => ir("hor")} onItem={(id) => { ir("cat"); if (id && me) setTimeout(() => me.abrir(id), 60); }} /></div>) : null}
            {tienda && f.cat !== "NEG-TIENDA" && (tienda.L.length || tienda.V.length) ? seccion("shop", E2("Tienda", "Shop"), <TiendaTab L={tienda.L} V={tienda.V} mia={tienda.mia} auto={f.cat === "NEG-AUTO"} horas={tienda.horas} plan={tienda.plan ?? null} negocio={f.id} es={es} guardados={tienda.g} sesion={sesion} abrirInicial={productoInicial} />) : null}
            {rv ? seccion("rsv", E2("Reservar mesa", "Reserve a table"), <div className="max-w-[620px]"><RsvTab v={rv} desk /></div>) : null}
            {eventos.length ? seccion("evt", E2("Eventos", "Events"), <EventosTab eventos={eventos} es={es} />) : null}
            {jobs.length ? seccion("jobs", "Jobs", <div className="max-w-[680px]"><JobsTab jobs={jobs} negocio={f.id} sesion={sesion} es={es} /></div>) : null}
            {!sinLocal ? seccion("hor", E2("Horario y cómo llegar", "Hours and directions"), <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">{horario}</div>) : null}
            {f.faqs.length || dep ? seccion("faq", E2("Antes de ir", "Before you go"), <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">{antes}</div>) : null}
            {f.relacionados.length ? seccion("rel", E2("Relacionados", "Related"), <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">{relacionados}</div>) : null}
          </div>
          <aside className="sticky min-w-0 self-start" style={{ top: CAB_DESK + 78 }}>
            {sv ? <TarjetaCita v={sv} cfg={cfg} es={es} dsk={dsk} setDsk={setDsk} pulso={pulso} staffBook={staffBook} grupos={grupos} onVer={() => ir("cat")} /> : rv && (activa === "rsv" || rv.sel != null || !vende?.riel) ? <RsvRiel v={rv} /> : vende?.riel ?? null}
            {escribir || llegar ? (
              <div className="mt-3 flex gap-2">
                {escribir ? <div className="grid flex-1"><Button variant="secondary" size="md" icon="chat" block onClick={escribir}>{E2("Escribir", "Message")}</Button></div> : null}
                {llegar ? <div className="grid flex-1"><Button variant="secondary" size="md" icon="pin" block onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button></div> : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>) : null}

      {sv && <SvcHoja v={sv} />}
      {!sv && vende ? vende.capas : null}
      {rs && <ResCapas v={rs as CtlResenas} />}
      {aviso ? <div role="status" className="fixed bottom-[112px] left-1/2 z-[90] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-4 py-[11px] text-[12.5px] font-bold text-white shadow-[var(--shadow-float)] lg:bottom-7">{aviso}</div> : null}
    </div>
  );

}

/* Alturas de la cabecera de la app (AppShell): las pestañas se pegan justo debajo. */
const CAB_MOVIL = 57, CAB_DESK = 121;
const CHIP_SM = { padding: "5px 10px", fontSize: 11.5 };

/* ── La reserva (Belleza): 1 servicio y con quién → 2 día y hora → Booking (/cita) para Detalles y Revisa y envía ── */
type Bk = { who: string | null; svc: string | null; opts: Record<string, number>; i: number; h: number | null; step: 1 | 2 };
const nuevaBk = (v: Svc): Bk => ({ who: v.silla ? null : "any", svc: null, opts: {}, i: 0, h: null, step: 1 });

/* Las horas del día elegido las decide el servidor (horasDeCita, la misma acción de Booking). */
function useHoras(v: Svc, b: Pick<Bk, "who" | "svc" | "opts" | "i">, on: boolean) {
  const [H, setH] = useState<HorasCita | null>(null);
  const [cargando, setCargando] = useState(false);
  const s = b.svc ? v.cp.servicios.find((x) => x.id === b.svc) ?? null : null;
  const listo = !!s && s.opts.every((_, gi) => b.opts[String(gi)] != null) && (!v.silla || !!b.who);
  const key = JSON.stringify([b.svc, b.opts, b.who, b.i]);
  useEffect(() => {
    if (!on || !listo || !s) { setH(null); return; }
    let vivo = true; setCargando(true);
    void horasDeCita(v.cp.negocio.id, { svc: s.id, opts: b.opts, adds: [], con: b.who ?? "any", i: b.i }).then((x) => { if (vivo) { setH(x); setCargando(false); } });
    return () => { vivo = false; };
  }, [key, on, listo]); // eslint-disable-line react-hooks/exhaustive-deps
  return { H, cargando, s, listo };
}

function Elegir({ v, b, up, cfg, es, staffBook, corto }: { v: Svc; b: Bk; up: (o: Partial<Bk>) => void; cfg: Cfg; es: boolean; staffBook: boolean; corto?: boolean }) {
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c), L = (x: [string, string]) => (es ? x[0] : x[1]);
  const cp = v.cp;
  const [catF, setCatF] = useState("all");
  const own = b.who && b.who !== "any" ? b.who : null;
  const lista = cp.servicios.filter((s) => !own || s.hacen.some((h) => h.id === own));
  const people = staffBook ? cp.gente.filter((p) => !b.svc || cp.servicios.find((s) => s.id === b.svc)?.hacen.some((h) => h.id === p.id)).map((p) => {
    const nx = v.prx(p.id); return { id: p.id, name: p.corto, image: p.foto ?? undefined, next: nx ? (nx.i === 0 ? `${E2("LIBRE ", "OPEN ")}${horaL(nx.m)}` : diaS(cp.hoy, nx.i, es)).toUpperCase() : E2("SIN HORAS", "NO TIMES"), soon: nx?.i === 0 };
  }) : [];
  const secs = [...cp.secciones.map((sc) => ({ id: sc.id, name: es ? sc.name.es : sc.name.en || sc.name.es })), { id: "_", name: E2("Otros", "Other") }]
    .filter((sc) => lista.some((s) => (sc.id === "_" ? !cp.secciones.some((x) => x.id === s.sec) : s.sec === sc.id)));
  // En la tarjeta de la computadora, lo más pedido (el primero de cada sección) y lo elegido; la lista completa está en la sección.
  const top = secs.slice(0, 3).map((sc) => lista.find((s) => (sc.id === "_" ? !cp.secciones.some((x) => x.id === s.sec) : s.sec === sc.id))).filter(Boolean) as typeof lista;
  const ver = corto ? [...(b.svc && !top.some((x) => x.id === b.svc) ? lista.filter((x) => x.id === b.svc) : []), ...top].slice(0, 3)
    : lista.filter((s) => catF === "all" || (catF === "_" ? !cp.secciones.some((x) => x.id === s.sec) : s.sec === catF));
  const s = b.svc ? cp.servicios.find((x) => x.id === b.svc) ?? null : null;
  const nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es);
  return (
    <>
      {people.length ? <><Eyebrow>{L(cfg.label)}</Eyebrow><div className="grid"><StaffPicker people={people} selected={b.who ?? ""} onSelect={(id: string) => up({ who: id, h: null })} anyoneLabel={v.silla ? "" : E2("Cualquiera", "Anyone")} /></div></> : null}
      <Eyebrow style={{ marginTop: 8 }}>{L(cfg.tab)}</Eyebrow>
      {secs.length > 1 && !corto ? <div className="hs -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">{[{ id: "all", name: E2("Todos", "All") }, ...secs].map((c) => <Chip key={c.id} variant={catF === c.id ? "selected" : "filter"} onClick={() => setCatF(c.id)}>{c.name}</Chip>)}</div> : null}
      {ver.map((x) => {
        const P = precio(x, cp.extras, { opts: {}, adds: [] }, own);
        return <div key={x.id} className="grid"><ServiceRow name={nm(x.name)} meta={durL(x.dur).toUpperCase()} price={`${x.opts.some((g) => g.o.some((o) => o.p > 0)) || x.desde ? E2("Desde ", "From ") : ""}${dinero(P.cents)}`} selected={b.svc === x.id} onClick={() => up({ svc: x.id, opts: {}, h: null })} /></div>;
      })}
      {s ? s.opts.map((g, gi) => (
        <div key={gi} className="mt-2 grid"><OptionGroup title={nm(g.t)} meta={E2("ELIGE 1", "CHOOSE 1")} required done={b.opts[String(gi)] != null} reqLabel={E2("OBLIGATORIO", "REQUIRED")} doneLabel={E2("LISTO", "DONE")}
          options={g.o.map((o, oi) => ({ label: nm(o.n), price: o.p ? `+${dinero(o.p)}` : "", selected: b.opts[String(gi)] === oi }))} onToggle={(oi: number) => up({ opts: { ...b.opts, [String(gi)]: oi }, h: null })} /></div>
      )) : null}
    </>
  );
}

function DiaHora({ v, b, up, H, cargando, es }: { v: Svc; b: Bk; up: (o: Partial<Bk>) => void; H: HorasCita | null; cargando: boolean; es: boolean }) {
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c);
  const DOW = es ? ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"] : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const days = (H?.dias ?? []).map((d) => ({ id: `d${d.i}`, dow: d.i === 0 ? E2("HOY", "TODAY") : DOW[d.dow], num: d.num, off: d.off }));
  const slots = (H?.grupos ?? []).flatMap((g) => g.sl).map((x) => ({ t: x.l, taken: !x.free }));
  const sel = b.h != null ? H?.grupos.flatMap((g) => g.sl).find((x) => x.m === b.h)?.l ?? null : null;
  return (
    <>
      <Eyebrow>{E2("DÍA", "DAY")}</Eyebrow>
      <div className="grid"><DateStrip days={days} selected={`d${b.i}`} onSelect={(id: string) => up({ i: Number(id.slice(1)), h: null })} /></div>
      <Eyebrow style={{ marginTop: 8 }}>{E2("HORA", "TIME")}</Eyebrow>
      {cargando && !H ? <div className="py-6 text-center text-[13px] font-semibold text-ink/60">{E2("Buscando horas…", "Finding times…")}</div>
        : slots.length && slots.some((x) => !x.taken) ? <div className="grid"><TimeSlots slots={slots} selected={sel} onSelect={(l: string) => { const x = H?.grupos.flatMap((g) => g.sl).find((z) => z.l === l && z.free); if (x) up({ h: x.m }); }} /></div>
          : <div className="rounded-[15px] bg-paper px-4 py-3.5 text-[13px] font-semibold leading-[1.5] text-ink/60">{E2("No quedan horas este día. Elige otro.", "No times left this day. Pick another.")}</div>}
      {void v}
    </>
  );
}

/* Teléfono: la hoja de 3 pasos. Los pasos 1 y 2 aquí; «Continuar» lleva a Booking con lo elegido (Detalles y Revisa y envía). Si el
   servicio tiene extras, la hoja de siempre (SvcHoja) los ofrece y sigue igual que antes. */
function HojaCita({ v, bk, setBk, cfg, es }: { v: Svc; bk: Bk; setBk: (b: Bk | null) => void; cfg: Cfg; es: boolean }) {
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c), L = (x: [string, string]) => (es ? x[0] : x[1]);
  const router = useRouter();
  const up = (o: Partial<Bk>) => setBk({ ...bk, ...o });
  const staffBook = v.silla || (v.cp.pol.pick && v.cp.gente.length > 1);
  const { H, cargando, s, listo } = useHoras(v, bk, bk.step === 2);
  const own = bk.who && bk.who !== "any" ? bk.who : null;
  const P = s ? precio(s, v.cp.extras, { opts: bk.opts, adds: [] }, own) : null;
  const falta1 = !s ? E2("Elige un servicio", "Choose a service") : v.silla && !bk.who ? E2("Elige con quién", "Choose who") : !listo ? E2("Elige las opciones", "Choose the options") : "";
  const conExtras = v.cp.extras.length > 0;
  const seguir = () => {
    if (bk.step === 1) {
      if (falta1 || !s) return;
      // Con extras: la hoja de siempre (opciones, extras y con quién) y de ahí a Booking.
      if (conExtras) { setBk(null); v.setHoja({ svc: s.id, opts: bk.opts, adds: [], con: v.silla ? bk.who : bk.who ?? "any" }); return; }
      return up({ step: 2 });
    }
    if (!s || bk.h == null) return;
    router.push(`${citaUrl(v.cp.negocio.id, { svc: s.id, opts: bk.opts, adds: [], con: v.silla ? bk.who : bk.who ?? "any" })}&i=${bk.i}&h=${bk.h}`);
  };
  const cta = bk.step === 1 ? (falta1 || E2("Continuar", "Continue")) : bk.h == null ? E2("Elige una hora", "Choose a time") : E2("Continuar", "Continue");
  return (
    <div data-screen-label="App · Booking" className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setBk(null)} className="absolute inset-0 bg-ink/45" />
      <div role="dialog" aria-modal="true" aria-label={bk.step === 1 ? L(cfg.s1) : L(cfg.s2)} className="absolute inset-x-0 bottom-0 top-[58px] flex flex-col overflow-hidden rounded-t-[26px] bg-paper">
        <StepHeader title={bk.step === 1 ? L(cfg.s1) : L(cfg.s2)} step={bk.step} total={3} backLabel={E2("Volver", "Back")} onBack={() => (bk.step > 1 ? up({ step: 1 }) : setBk(null))} />
        <div className="hs min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-[18px]"><div className="flex flex-col gap-3">
          {bk.step === 1 ? <Elegir v={v} b={bk} up={up} cfg={cfg} es={es} staffBook={staffBook} /> : <DiaHora v={v} b={bk} up={up} H={H} cargando={cargando} es={es} />}
          {bk.step === 2 && P ? <div className="mt-1 grid"><DepositNote>{depositoTexto(v, own, es)}</DepositNote></div> : null}
        </div></div>
        <TotalBar label="TOTAL" total={P ? dinero(P.cents) : "—"} cta={cta} onCta={seguir} />
        <div className="h-[calc(10px+env(safe-area-inset-bottom))] bg-white" />
      </div>
    </div>
  );
}

const depositoTexto = (v: Svc, own: string | null, es: boolean) => {
  const p = own ? v.cp.gente.find((x) => x.id === own) : null, dep = p?.dep ?? Math.max(0, ...v.cp.gente.map((x) => x.dep));
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c);
  return dep ? E2(`Todavía no es una cita: el negocio acepta en unos ${v.cp.pol.resp} min. Si rechaza o no responde en ${v.cp.pol.exp} h, el depósito de ${dinero(dep)} se libera.`, `Not a booking yet: the business accepts in about ${v.cp.pol.resp} min. If it declines or does not reply in ${v.cp.pol.exp} h, the ${dinero(dep)} deposit is released.`)
    : E2(`Todavía no es una cita: el negocio la confirma en unos ${v.cp.pol.resp} min.`, `Not a booking yet: the business confirms in about ${v.cp.pol.resp} min.`);
};

/* Computadora: la tarjeta pegada a la derecha (con quién, servicio, día y hora) y «Continuar» a Booking. */
function TarjetaCita({ v, cfg, es, dsk, setDsk, pulso, staffBook, grupos, onVer }: { v: Svc; cfg: Cfg; es: boolean; dsk: Bk; setDsk: (f: (b: Bk) => Bk) => void; pulso: boolean; staffBook: boolean; grupos: Grupo[]; onVer: () => void }) {
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c), L = (x: [string, string]) => (es ? x[0] : x[1]);
  const router = useRouter();
  const up = (o: Partial<Bk>) => setDsk((d) => ({ ...d, ...o }));
  const { H, cargando, s, listo } = useHoras(v, dsk, true);
  const own = dsk.who && dsk.who !== "any" ? dsk.who : null;
  const P = s ? precio(s, v.cp.extras, { opts: dsk.opts, adds: [] }, own) : null;
  const nItems = grupos.reduce((a, g) => a + g.items.length, 0);
  if (!v.cp.can) return (
    <div className="rounded-[22px] border border-ink/[.08] bg-white p-5 shadow-[var(--shadow-float)]">
      <div className="font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.035em]">{L(cfg.cta)}</div>
      <div className="mt-2 text-[13px] font-medium leading-[1.55] text-ink/60">{v.nota}</div>
    </div>
  );
  const falta = !s ? E2("Elige un servicio", "Choose a service") : v.silla && !dsk.who ? E2("Elige con quién", "Choose who") : !listo ? E2("Elige las opciones", "Choose the options") : dsk.h == null ? E2("Elige una hora", "Choose a time") : "";
  const conExtras = v.cp.extras.length > 0;
  const enviar = () => {
    if (!s) return;
    if (conExtras && listo) return v.setHoja({ svc: s.id, opts: dsk.opts, adds: [], con: v.silla ? dsk.who : dsk.who ?? "any" });
    if (falta) return;
    router.push(`${citaUrl(v.cp.negocio.id, { svc: s.id, opts: dsk.opts, adds: [], con: v.silla ? dsk.who : dsk.who ?? "any" })}&i=${dsk.i}&h=${dsk.h}`);
  };
  return (
    <div data-screen-label="Ficha · Booking · columna" className="max-h-[calc(100vh-220px)] overflow-y-auto rounded-[22px] bg-white transition-shadow"
      style={{ border: pulso ? "1.5px solid var(--tl-action)" : "1px solid rgba(11,14,18,.08)", boxShadow: pulso ? "0 0 0 6px rgba(75,55,245,.12), var(--shadow-float)" : "var(--shadow-float)" }}>
      <div className="px-5 pt-5"><div className="font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.035em]">{L(cfg.cta)}</div>{v.desde ? <div className="mt-[5px] text-[13px] font-semibold text-ink/60">{E2("Desde", "From")} {dinero(v.desde)}</div> : null}</div>
      <div className="flex flex-col gap-2.5 px-5 pt-[18px]">
        <Elegir v={v} b={dsk} up={up} cfg={cfg} es={es} staffBook={staffBook} corto />
        {nItems > 3 ? <button type="button" onClick={onVer} className="inline-flex min-h-11 items-center self-start text-[12.5px] font-bold text-action">{E2("Ver", "See")} {nItems}</button> : null}
      </div>
      {s && listo && !conExtras ? <div className="flex flex-col gap-2.5 px-5 pt-[18px]"><DiaHora v={v} b={dsk} up={up} H={H} cargando={cargando} es={es} /><div className="grid"><DepositNote>{depositoTexto(v, own, es)}</DepositNote></div></div> : null}
      <div className="sticky bottom-0 mt-[18px] flex flex-col gap-3 border-t border-ink/[.08] bg-white px-5 pb-5 pt-4">
        <div className="flex items-end justify-between gap-3"><div><div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/60">TOTAL</div><div className="mt-1 font-display text-[24px] font-extrabold leading-none tracking-[-0.03em]">{P ? dinero(P.cents) : "—"}</div></div>
          {dsk.h != null && H ? <div className="text-right text-[12.5px] font-bold text-ink/70">{diaS(v.cp.hoy, dsk.i, es)} · {horaL(dsk.h)}</div> : null}</div>
        <div className="grid"><Button variant="primary" size="lg" block disabled={!!falta && !(conExtras && s && listo)} onClick={enviar}>{conExtras && s && listo ? E2("Elegir extras, día y hora", "Choose extras, day and time") : E2("Continuar", "Continue")}</Button></div>
        {falta && !(conExtras && s && listo) ? <div className="-mt-1 text-center text-[12px] font-semibold text-ink/60">{falta}</div> : null}
      </div>
    </div>
  );
}
