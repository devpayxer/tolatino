"use client";
/* Servicios en la ficha de un taller (Auto) o un servicio del hogar (Hogar). Diseño: neg-auto-book.js y neg-hogar-book.js
   (TLAutoBook / TLHogarBook: Servicios, hoja del servicio con Tu vehículo o Tu casa y su compatibilidad, opciones, ¿esperas o
   lo dejas?, extras, depósito; hojas «Tu vehículo» (vhs) y «Tu casa» (hcs)). La misma pestaña y la misma hoja que Belleza
   (Ficha · servicios / Servicio · opciones), compuestas con el sistema de diseño. El servidor recalcula todo al enviar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type MouseEvent } from "react";
import type { Casa, OficioPub, OficiosPublico, Vehiculo } from "@/lib/oficios-publico";
import { detalleL, precioL } from "@/lib/oficios-texto";
import { casaElegir, casaGuardar, vehiculoElegir, vehiculoGuardar } from "./acciones-oficio";

type N = "Icon" | "Button" | "Chip" | "OptionGroup" | "AddOnRow" | "DepositNote" | "ReservationCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, OptionGroup, AddOnRow, DepositNote } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";

export const SZ: Record<string, [string, string]> = { c: ["Carro", "Car"], s: ["SUV o pickup", "SUV or pickup"], v: ["Van o 3 filas", "Van or 3 rows"], m: ["Moto", "Motorcycle"], d: ["Camión o diésel", "Truck or diesel"] };
const TOPV = ["toyota", "honda", "nissan", "ford", "chevy", "hyundai", "kia", "jeep"];
const MARCAS: [string, string][] = [["acura", "Acura"], ["alfa", "Alfa Romeo"], ["audi", "Audi"], ["bmw", "BMW"], ["buick", "Buick"], ["cadillac", "Cadillac"], ["chevy", "Chevrolet"], ["chrysler", "Chrysler"], ["dodge", "Dodge"], ["fiat", "Fiat"],
  ["ford", "Ford"], ["freightliner", "Freightliner"], ["genesis", "Genesis"], ["gmc", "GMC"], ["hino", "Hino"], ["honda", "Honda"], ["hyundai", "Hyundai"], ["infiniti", "Infiniti"], ["international", "International"], ["isuzu", "Isuzu"], ["jaguar", "Jaguar"], ["jeep", "Jeep"],
  ["kenworth", "Kenworth"], ["kia", "Kia"], ["landrover", "Land Rover"], ["lexus", "Lexus"], ["lincoln", "Lincoln"], ["mack", "Mack"], ["mazda", "Mazda"], ["mercedes", "Mercedes-Benz"], ["mini", "Mini"], ["mitsubishi", "Mitsubishi"], ["nissan", "Nissan"],
  ["peterbilt", "Peterbilt"], ["porsche", "Porsche"], ["ram", "Ram"], ["subaru", "Subaru"], ["tesla", "Tesla"], ["toyota", "Toyota"], ["vw", "Volkswagen"], ["volvo", "Volvo"], ["otra", "Otra marca"]];
const mkName = (k: string, es: boolean) => (k === "otra" ? (es ? "Otra marca" : "Other make") : MARCAS.find((m) => m[0] === k)?.[1] ?? k);
/* Modelos con su tamaño y la medida de las gomas (diseño TLAutoBook.MODELS). */
const MODELOS: Record<string, [string, string, string][]> = { toyota: [["Corolla", "c", "205/55R16"], ["Camry", "c", "215/55R17"], ["RAV4", "s", "225/65R17"], ["Highlander", "s", "245/60R18"], ["Tacoma", "s", "245/75R16"], ["Sienna", "v", "235/60R17"]],
  honda: [["Civic", "c", "215/55R16"], ["Accord", "c", "225/50R17"], ["CR-V", "s", "225/65R17"], ["Pilot", "s", "245/60R18"], ["Odyssey", "v", "235/60R18"]], nissan: [["Sentra", "c", "205/55R16"], ["Altima", "c", "215/60R16"], ["Rogue", "s", "225/65R17"], ["Pathfinder", "s", "235/65R18"], ["Frontier", "s", "265/70R16"]],
  ford: [["Focus", "c", "215/55R16"], ["Fusion", "c", "235/50R17"], ["Escape", "s", "235/55R17"], ["Explorer", "s", "255/65R18"], ["F-150", "s", "265/70R17"]], chevy: [["Malibu", "c", "225/55R17"], ["Equinox", "s", "225/65R17"], ["Traverse", "s", "255/65R18"], ["Silverado", "s", "265/70R17"], ["Express", "v", "245/75R16"]],
  jeep: [["Compass", "s", "215/65R17"], ["Cherokee", "s", "225/60R17"], ["Grand Cherokee", "s", "265/60R18"], ["Wrangler", "s", "245/75R17"]], hyundai: [["Elantra", "c", "205/55R16"], ["Sonata", "c", "215/55R17"], ["Tucson", "s", "225/60R17"], ["Santa Fe", "s", "235/60R18"]],
  kia: [["Forte", "c", "205/55R16"], ["K5", "c", "215/55R17"], ["Sportage", "s", "235/60R17"], ["Sorento", "s", "235/65R17"], ["Telluride", "s", "245/60R18"]], dodge: [["Charger", "c", "245/55R18"], ["Journey", "s", "225/65R17"], ["Durango", "s", "265/60R18"], ["Grand Caravan", "v", "225/65R17"]],
  ram: [["1500", "s", "275/65R18"], ["2500", "s", "275/70R18"], ["ProMaster", "v", "225/75R16"]] };
const TIPO: [string, string, string][] = [["casa", "Casa", "House"], ["apto", "Apartamento", "Apartment"], ["duplex", "Dúplex o twin", "Duplex or twin"], ["movil", "Casa móvil", "Mobile home"]];
const OWN: [string, string, string][] = [["dueno", "Soy dueño", "I own"], ["inq", "Soy inquilino", "I rent"], ["land", "Tengo propiedades de renta", "I have rental properties"]];
const YR: [string, string, string][] = [["pre50", "Antes de 1950", "Before 1950"], ["50", "1950–1979", "1950–1979"], ["80", "1980–1999", "1980–1999"], ["00", "2000 o después", "2000 or later"]];
const PETS: [string, string, string][] = [["no", "No", "No"], ["perro", "Perro", "Dog"], ["gato", "Gato", "Cat"], ["otra", "Otra", "Other"]];
const HEAT: [string, string, string][] = [["caldera", "Caldera (agua o vapor)", "Boiler (water or steam)"], ["horno", "Horno de aire", "Furnace"], ["bomba", "Bomba de calor", "Heat pump"], ["zocalo", "Eléctrica de zócalo", "Electric baseboard"]];
const WH: [string, string, string][] = [["gas", "Gas", "Gas"], ["elec", "Eléctrico", "Electric"], ["sintanque", "Sin tanque", "Tankless"], ["aceite", "Aceite", "Oil"]];
const AGE: [string, string, string][] = [["5", "Menos de 5 años", "Under 5 years"], ["10", "5 a 10", "5 to 10"], ["20", "10 a 20", "10 to 20"], ["mas", "Más de 20", "Over 20"], ["ns", "No sé", "Not sure"]];
const lab = (L: [string, string, string][], k: string | null, es: boolean) => { const x = L.find((z) => z[0] === k); return x ? (es ? x[1] : x[2]) : ""; };
export const vehName = (v: Vehiculo, es: boolean) => `${v.year} ${mkName(v.make, es)} ${v.model}`;
export const vehMeta = (v: Vehiculo, es: boolean) => `${SZ[v.size]?.[es ? 0 : 1] ?? ""}${v.mileage ? ` · ${v.mileage.toLocaleString("en-US")} mi` : ""}${v.tire ? `${es ? " · gomas " : " · tires "}${v.tire}` : ""}`.toUpperCase();
export const casaMeta = (c: Casa, es: boolean) => [lab(TIPO, c.kind, es), c.beds != null ? `${c.beds}${es ? " cuartos" : " bedrooms"}` : "", c.baths ? `${c.baths}${es ? " baños" : " baths"}` : "", lab(OWN, c.tenure, es)].filter(Boolean).join(" · ").toUpperCase();

/* ¿Trabajan con tu vehículo o llegan a tu casa? (diseño compat; el servidor lo vuelve a revisar al enviar). */
export function compatVeh(op: OficiosPublico, v: Vehiculo | null, es: boolean) {
  if (!v) return null;
  const E2 = (a: string, b: string) => (es ? a : b), cls = v.size === "v" ? "s" : v.size;
  if (op.compat.veh && !op.compat.veh.includes(cls)) return { ok: false, t: E2(`Aquí no trabajan con ${(SZ[v.size]?.[0] ?? "").toLowerCase()}s`, `They do not work on ${(SZ[v.size]?.[1] ?? "").toLowerCase()}s here`) };
  if (v.make === "otra") return { ok: true, t: E2("Marca no listada: te confirman al aceptar la cita", "Unlisted make: confirmed when they accept") };
  if (op.compat.mk && !op.compat.mk.includes(v.make)) return { ok: false, t: E2(`Este taller no trabaja con ${mkName(v.make, true)}`, `This shop does not work on ${mkName(v.make, false)}`) };
  return { ok: true, t: E2(`Trabajan con tu ${v.model}`, `They work on your ${v.model}`) };
}
export function compatCasa(op: OficiosPublico, c: Casa | null, es: boolean) {
  if (!c) return null;
  const E2 = (a: string, b: string) => (es ? a : b), d = c.millas, z = op.tool.zone ?? 20;
  if (!c.enZona) return { ok: false, warn: false, t: E2(`Tu casa queda a ${d ?? "—"} mi: llegan hasta ${z} mi`, `Your home is ${d ?? "—"} mi away: they go up to ${z} mi`) };
  if (c.tenure === "inq" && op.compat.tenure && !op.compat.tenure.includes("inq")) return { ok: false, warn: false, t: E2("Solo trabajan con dueños de casa", "They only work with homeowners") };
  if (c.tenure === "inq") return { ok: true, warn: true, t: E2(`Llega a tu casa${d != null ? ` (${d} mi)` : ""}. Necesitas el permiso de tu landlord`, `They reach you${d != null ? ` (${d} mi)` : ""}. You need your landlord’s permission`) };
  return { ok: true, warn: false, t: E2(`Llega a tu casa${d != null ? ` · ${d} mi` : ""}`, `They reach your home${d != null ? ` · ${d} mi` : ""}`) };
}
/* El depósito que verá el cliente (diseño depOf; el servidor decide el de verdad). */
export function depositoVer(op: OficiosPublico, s: OficioPub, precio: number) {
  const pol = op.pol;
  if (!pol.dep || s.a?.walk || ["grua", "emer", "plan"].includes(s.k)) return 0;
  if (pol.kinds?.length && !pol.kinds.includes(s.k)) return 0;
  if (pol.min && precio < pol.min) return 0;
  const amt = pol.big && pol.bigOver && precio >= pol.bigOver ? pol.big : pol.dep;
  return precio > 0 && !["desde", "cotiza", "pres"].includes(s.k) ? Math.min(amt, precio) : amt;
}

type Hoja = { svc: string; opts: Record<string, number>; adds: number[]; sz: number | null; wm: string | null };
export function useOficio(op: OficiosPublico | null, es: boolean, sesion: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [vehs, setVehs] = useState<Vehiculo[]>(op?.vehiculos ?? []);
  const [casas, setCasas] = useState<Casa[]>(op?.casas ?? []);
  const [sheet, setSheet] = useState<null | "veh" | "casa">(null);
  // 4e: «Reservar con este pre-estimado» abre la hoja del servicio (?of=servicio&pre=P-…) y el Booking lleva el pre-estimado.
  const [pre, setPre] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search), of = q.get("of"), p = q.get("pre");
    if (p && /^[PQ]-\d{1,10}$/.test(p)) setPre(p);
    if (of && /^\d{1,18}$/.test(of) && op?.servicios.some((s) => s.id === of)) setHoja({ svc: of, opts: {}, adds: [], sz: null, wm: null });
  }, [op]);
  if (!op) return null;
  const auto = op.rubro === "auto", nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const veh = vehs.find((v) => v.def) ?? vehs[0] ?? null, casa = casas.find((c) => c.def) ?? casas[0] ?? null;
  const cp = auto ? compatVeh(op, veh, es) : compatCasa(op, casa, es);
  const abrir = (svc: string, e?: MouseEvent) => { stop(e); setHoja({ svc, opts: {}, adds: [], sz: null, wm: null }); };
  const item = (s: OficioPub) => ({ id: s.id, name: nm(s.name), foto: s.foto, meta: detalleL(op.rubro, s, es).toUpperCase(), price: precioL(s, es), k: s.k, walk: !!s.a?.walk });
  const secs = [...op.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: op.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: op.servicios.filter((s) => !op.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  const notes: [string, string][] = [];
  notes.push(auto ? ["shield", E2("Nada se hace ni se cobra sin tu OK. El taller te da el estimado antes de tocar el carro.", "Nothing is done or charged without your OK. The shop gives you the estimate before touching the car.")]
    : ["shield", E2("Precio completo antes de empezar. Si algo cambia, te pregunta primero.", "Full price before starting. If something changes, they ask you first.")]);
  if (!op.can) notes.push(["clock", op.off === "tope" ? E2("Llama para pedir tu cita o pasa por el negocio.", "Call to book or stop by.") : E2("Por ahora no toma citas en línea: llama al negocio.", "Not taking online bookings right now: call the business.")]);
  const precios = op.servicios.filter((s) => s.k !== "cotiza" && s.cents > 0).map((s) => (s.k === "lav" && s.a.sz ? s.a.sz[0] : s.cents));
  const desde = precios.length ? Math.min(...precios) : 0;
  const dep = op.pol.dep;
  const riel = auto ? [
    { k: E2("GARANTÍA", "WARRANTY"), v: op.tool.warrM ? E2(`${op.tool.warrM} meses`, `${op.tool.warrM} months`) : "—" },
    { k: E2("MISMO DÍA", "SAME DAY"), v: op.tool.cut ? E2(`Antes de las ${op.tool.cut % 12 || 12} ${op.tool.cut < 12 ? "AM" : "PM"}`, `By ${op.tool.cut % 12 || 12} ${op.tool.cut < 12 ? "AM" : "PM"}`) : "—" },
    { k: E2("DEPÓSITO", "DEPOSIT"), v: dep ? dinero(dep) : E2("No pide", "None") },
  ] : [
    { k: E2("LLEGA HASTA", "TRAVELS"), v: op.tool.zone ? `${op.tool.zone} mi` : "—" },
    { k: E2("EMERGENCIAS", "EMERGENCIES"), v: op.tool.h24 ? "24/7" : E2("No", "No") },
    { k: E2("DEPÓSITO", "DEPOSIT"), v: dep ? dinero(dep) : E2("No pide", "None") },
  ];
  const nota = !op.can ? notes.find((n) => n[0] === "clock")?.[1] ?? "" : op.pol.auto ? E2("Confirma al instante: si ves la hora libre, es tuya.", "Confirms instantly: if the time is open, it is yours.")
    : E2(`Booking es una solicitud: el negocio confirma en ~${op.pol.resp} min.`, `Booking is a request: the business confirms in ~${op.pol.resp} min.`);
  return {
    op, es, E2, auto, nm, secs, notes, top: op.servicios.slice(0, 4).map(item), desde, riel, nota, abrir, hoja, setHoja, cerrar: () => setHoja(null),
    veh, casa, vehs, casas, setVehs, setCasas, cp, sheet, setSheet: (x: null | "veh" | "casa") => { if (x && !sesion) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`); return; } setSheet(x); },
    llamar: () => { if (op.negocio.telefono) location.href = `tel:${op.negocio.telefono}`; }, pre,
  };
}
export type Of = NonNullable<ReturnType<typeof useOficio>>;

function Fila({ v, it, tarjeta }: { v: Of; it: Of["top"][number]; tarjeta?: boolean }) {
  const cta = !v.op.can || it.k === "grua" ? v.E2("Llamar", "Call") : it.walk ? v.E2("Ver", "See") : "Booking";
  return (
    <div role="button" tabIndex={0} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (e.key === "Enter") v.abrir(it.id); }}
      className={tarjeta ? "flex cursor-pointer items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex cursor-pointer items-center gap-[13px] border-b border-ink/[.07] py-3.5"}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, e)}>{cta}</Button>
    </div>
  );
}

/* El bloque Tu vehículo / Tu casa (diseño V.ax.veh), en la pestaña y en la hoja. */
function Bloque({ v, sz }: { v: Of; sz?: boolean }) {
  const { E2, es } = v, auto = v.auto;
  const t = auto ? (v.veh ? vehName(v.veh, es) : sz ? E2("Agrégalo y te damos el precio exacto", "Add it for the exact price") : E2("Agrégalo: va con tu cita y tu estimado", "Add it: it goes with your booking and estimate"))
    : v.casa ? v.casa.dir : E2("Agrégala: te decimos si llegan hasta ahí", "Add it: we tell you if they reach you");
  const s = auto ? (v.veh ? vehMeta(v.veh, es) : "") : v.casa ? casaMeta(v.casa, es) : "";
  return (
    <button type="button" onClick={() => v.setSheet(auto ? "veh" : "casa")} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name={auto ? "car" : "home"} size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{auto ? (v.veh ? E2("TU VEHÍCULO", "YOUR VEHICLE") : E2("¿QUÉ CARRO ES?", "WHICH CAR?")) : v.casa ? E2("VA A TU CASA", "COMING TO YOUR HOME") : E2("¿DÓNDE ES?", "WHERE IS IT?")}</span>
        <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{t}</span>
        {s && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{s}</span>}
        {v.cp && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: v.cp.ok ? ("warn" in v.cp && v.cp.warn ? "var(--tl-pro-ink)" : "var(--tl-open-text)") : "var(--tl-danger)" }}>
          <Icon name={v.cp.ok && !("warn" in v.cp && v.cp.warn) ? "check" : "warning"} size={13} color="currentColor" />{v.cp.t}</span>}
      </span>
      <span className="flex-none text-[12.5px] font-bold text-action">{(auto ? v.veh : v.casa) ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
    </button>
  );
}

export function OfTab({ v, desk }: { v: Of; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <Bloque v={v} />
      {v.notes.map(([ic, t]) => (
        <div key={t} className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]">
          <span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span>
          <span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span>
        </div>
      ))}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* La hoja del servicio (Servicio · opciones). */
export function OfHoja({ v }: { v: Of }) {
  const router = useRouter();
  const { op, E2, es, hoja: q, auto } = v;
  if (!q) return null;
  const s = op.servicios.find((x) => x.id === q.svc);
  if (!s) return null;
  const up = (o: Partial<Hoja>) => v.setHoja({ ...q, ...o });
  const a = s.a ?? {};
  // El tamaño del carro (lavado): del vehículo si lo hay; si no, se elige.
  const szIdx = a.sz ? (v.veh ? (v.veh.size === "c" ? 0 : v.veh.size === "v" ? 2 : 1) : q.sz) : null;
  const groups: { title: string; meta: string; done: boolean; opts: { label: string; price: string; selected: boolean }[]; onToggle: (k: number) => void }[] = [];
  if (a.sz && !v.veh) groups.push({ title: E2("Tamaño de tu carro", "Your car size"), meta: E2("ELIGE 1 · CAMBIA EL PRECIO", "CHOOSE 1 · CHANGES THE PRICE"), done: q.sz != null,
    opts: (["c", "s", "v"] as const).map((k, i) => ({ label: SZ[k]![es ? 0 : 1], price: dinero(a.sz![i]!), selected: q.sz === i })), onToggle: (i) => up({ sz: i }) });
  s.opts.forEach((g, gi) => { const sel = q.opts[String(gi)]; groups.push({ title: v.nm(g.t), meta: E2("ELIGE 1", "CHOOSE 1"), done: sel != null,
    opts: g.o.map((o, k) => ({ label: `${v.nm(o.n)}${o.m ? ` · +${o.m} min` : ""}`, price: o.p ? `${o.p > 0 ? "+" : "−"}${dinero(Math.abs(o.p))}` : "", selected: sel === k })), onToggle: (k) => up({ opts: { ...q.opts, [String(gi)]: k } }) }); });
  if (auto && a.w === "ambos") groups.push({ title: E2("¿Esperas o lo dejas?", "Wait or drop off?"), meta: (a.days ? E2(`TE LO DEVUELVEN EN ${a.days[0]}–${a.days[1]} DÍAS`, `BACK IN ${a.days[0]}–${a.days[1]} DAYS`) : op.tool.cut ? E2(`HOY, SI LO DEJAS ANTES DE LAS ${op.tool.cut % 12 || 12} ${op.tool.cut < 12 ? "AM" : "PM"}`, `TODAY, IF DROPPED OFF BY ${op.tool.cut % 12 || 12} ${op.tool.cut < 12 ? "AM" : "PM"}`) : E2("CUÁNDO TE LO DEVUELVEN", "WHEN YOU GET IT BACK")),
    done: q.wm != null, opts: [...((s.dur ?? 0) <= 120 ? [{ k: "espera", label: E2("Espero en el taller", "I wait at the shop") }] : []), { k: "deja", label: E2("Lo dejo y me avisan", "I drop it off and they text me") }].map((o) => ({ label: o.label, price: "", selected: q.wm === o.k })),
    onToggle: (i) => up({ wm: ((s.dur ?? 0) <= 120 ? ["espera", "deja"] : ["deja"])[i] ?? null }) });
  const extras = a.x ?? [];
  const base = a.sz && szIdx != null ? a.sz[szIdx]! : s.cents;
  let total = base, dur = s.dur ?? 0;
  s.opts.forEach((g, gi) => { const o = g.o[q.opts[String(gi)] ?? -1]; if (o) { total += o.p; dur += o.m; } });
  q.adds.forEach((i) => { const x = extras[i]; if (x) { total += x.p; dur += x.m; } });
  const precioOk = !a.sz || szIdx != null;
  const totalL = s.k === "cotiza" ? E2("Se cotiza", "Quoted") : precioOk ? `${["desde", "pres"].includes(s.k) ? E2("Desde ", "From ") : ""}${s.k === "hora" ? `${dinero(total)}/h` : s.k === "plan" ? precioL({ ...s, cents: total }, es) : total ? dinero(total) : E2("Gratis", "Free")}` : `${E2("Desde ", "From ")}${dinero(a.sz![0]!)}`;
  const dep = depositoVer(op, s, total);
  const pend = groups.find((g) => !g.done), bad = !!v.cp && !v.cp.ok, sinDato = !(auto ? v.veh : v.casa);
  // Lo que no tiene Booking en este bloque: la grúa y «solo sin cita» se llaman o se visitan; emergencia, presupuesto a
  // varios y planes llegan con sus bloques (4e y 4f): por ahora se llama al negocio.
  // 4e: la emergencia se pide a todos los 24/7 que llegan a tu casa (/emergencia); la grúa y los planes, todavía llamando.
  const emer = s.k === "emer" && op.tool.h24, plan = s.k === "plan" && (!a.fr || a.fr === "mes") && !auto, llamar = s.k === "grua" || (s.k === "emer" && !emer) || (s.k === "plan" && !plan) || !op.can;
  const cta = emer ? E2("Pedir ayuda ahora", "Get help now") : plan && !llamar ? `${E2("Empezar el plan · ", "Start the plan · ")}${dinero(s.cents)}${E2("/mes", "/mo")}` : llamar ? E2("Llamar al negocio", "Call the business") : a.walk ? E2("Cómo llegar", "Directions") : sinDato ? (auto ? E2("Agrega tu vehículo", "Add your vehicle") : E2("Agrega tu casa", "Add your home"))
    : bad ? E2("No se puede con este", "Not possible with this one") : pend ? `${E2("Elige: ", "Choose: ")}${pend.title.toLowerCase()}` : auto ? E2("Elegir día y hora", "Choose day and time") : E2("Elegir franja", "Choose a time window");
  const go = () => {
    if (emer) return router.push(`/emergencia?b=${op.negocio.id}${a.sym?.[0] ? `&ek=${encodeURIComponent(a.sym[0])}` : ""}`);
    if (plan && !llamar) return router.push(`/n/${op.negocio.id}/plan?s=${s.id}`);
    if (llamar) return v.llamar();
    if (a.walk) return void window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(op.negocio.direccion ?? op.negocio.nombre)}`, "_blank", "noopener");
    if (sinDato) return v.setSheet(auto ? "veh" : "casa");
    if (bad || pend) return;
    const p = new URLSearchParams({ s: s.id });
    const o = Object.entries(q.opts).map(([g, k]) => `${g}-${k}`).join(","); if (o) p.set("o", o);
    if (q.adds.length) p.set("a", q.adds.join(","));
    if (q.wm) p.set("w", q.wm);
    if (a.sz && !v.veh && q.sz != null) p.set("z", String(q.sz));
    if (v.pre) p.set("pre", v.pre);
    router.push(`/n/${op.negocio.id}/visita?${p.toString()}`);
  };
  const lbl = { req: E2("OBLIGATORIO", "REQUIRED"), ready: E2("LISTO", "DONE") };
  const depT = dep ? E2(`Depósito de ${dinero(dep)}: se cobra al enviar y se descuenta del total. Si ${op.negocio.nombre} no confirma, te lo devolvemos.`, `${dinero(dep)} deposit: charged when you send and taken off the total. If ${op.negocio.nombre} does not confirm, we refund it.`) : "";
  const cuerpo = (
    <>
      <div className="relative h-[200px] flex-none bg-photo-bg" style={fondo(s.foto ?? op.negocio.foto)}>
        <div className="absolute left-1/2 top-2.5 -ml-[19px] h-1 w-[38px] rounded-[9px] bg-white/85 lg:hidden" />
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
      </div>
      <div className="px-5 pb-6 pt-[18px]">
        <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{v.nm(s.name)}</div>
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{totalL}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{detalleL(op.rubro, { ...s, dur: dur || s.dur }, es).toUpperCase()}</span></div>
        {v.nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{v.nm(s.desc)}</p>}
        {(a.inc?.length || a.no?.length) ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {(a.inc ?? []).map((z) => <div key={z.es} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.45] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.2} /></span>{v.nm(z)}</div>)}
            {(a.no ?? []).map((z) => <div key={z.es} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.45] text-ink/60"><span className="grid flex-none pt-0.5"><Icon name="info" size={13} color="rgba(11,14,18,.45)" /></span>{v.nm(z)}</div>)}
          </div>) : null}
        {!llamar && !a.walk && <div className="mt-5"><Bloque v={v} sz={!!a.sz} /></div>}
        {groups.map((g, gi) => <div key={gi} className="mt-5 grid"><OptionGroup title={g.title} meta={g.meta} required done={g.done} reqLabel={lbl.req} doneLabel={lbl.ready} options={g.opts} onToggle={g.onToggle} /></div>)}
        {extras.length > 0 && !llamar && (
          <div className="mt-5 border-t border-ink/[.08] pt-[18px]">
            <div className="text-[15px] font-bold">Extras</div>
            <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/45">{E2("OPCIONAL", "OPTIONAL")}</div>
            <div className="mt-[11px] flex flex-col gap-2">{extras.map((x, i) => <div key={i} className="grid"><AddOnRow label={`${v.nm(x.n)}${x.m ? ` · +${x.m} min` : ""}`} price={`+${dinero(x.p)}`} checked={q.adds.includes(i)} onToggle={() => up({ adds: q.adds.includes(i) ? q.adds.filter((z) => z !== i) : [...q.adds, i] })} /></div>)}</div>
          </div>
        )}
        {!auto && s.k === "pres" && op.can && (
          <div data-screen-label="Servicio · presupuesto a hasta 3" className="mt-[18px] rounded-2xl border-[1.5px] border-dashed border-action/35 bg-action/[.04] p-3.5">
            <div className="flex items-start gap-[11px]">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-action/[.12]"><Icon name="image" size={18} color="var(--tl-action)" /></span>
              <div className="min-w-0 flex-1"><div className="text-[14px] font-extrabold leading-[1.3]">{E2("¿Quieres comparar?", "Want to compare?")}</div>
                <div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-ink/65">{E2("Manda la misma solicitud a hasta 3 negocios y compara los presupuestos en la app.", "Send the same request to up to 3 businesses and compare estimates in the app.")}</div></div>
            </div>
            <div className="mt-3 flex"><Button variant="secondary" size="md" icon="image" block onClick={() => router.push(`/n/${op.negocio.id}/presupuestos?s=${s.id}`)}>{E2("Pedir a hasta 3", "Ask up to 3")}</Button></div>
          </div>
        )}
        {(auto ? ["desde", "cotiza"] : ["visita", "hora", "area"]).includes(s.k) && op.can && (
          <div data-screen-label="Servicio · pre-estimado" className="mt-[18px] rounded-2xl border-[1.5px] border-dashed border-action/35 bg-action/[.04] p-3.5">
            <div className="flex items-start gap-[11px]">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-action/[.12]"><Icon name="image" size={18} color="var(--tl-action)" /></span>
              <div className="min-w-0 flex-1"><div className="text-[14px] font-extrabold leading-[1.3]">{E2("¿No sabes cuánto va a salir?", "Not sure what it will cost?")}</div>
                <div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-ink/65">{auto ? E2(`Manda fotos y ${op.negocio.nombre} te da un rango antes de reservar. No te compromete.`, `Send photos and ${op.negocio.nombre} gives you a range before you book. No commitment.`) : E2(`Manda fotos y ${op.negocio.nombre} te da un rango antes de reservar. No te compromete.`, `Send photos and ${op.negocio.nombre} gives you a range before you book. No commitment.`)}</div></div>
            </div>
            <div className="mt-3 flex"><Button variant="secondary" size="md" icon="image" block onClick={() => router.push(`/n/${op.negocio.id}/preestimado?s=${s.id}`)}>{E2("Pedir pre-estimado", "Ask for a pre-estimate")}</Button></div>
          </div>
        )}
        {depT && !llamar && <div className="mt-[18px] grid"><DepositNote>{depT}</DepositNote></div>}
      </div>
    </>
  );
  const pie = (
    <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
      <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("TOTAL", "TOTAL")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{totalL}</div></div>
      <div className="flex min-w-0 flex-1"><Button block icon={emer ? "warning" : llamar ? "phone" : undefined} variant={emer ? "danger" : undefined} disabled={!emer && !plan && !llamar && !a.walk && !sinDato && (bad || !!pend)} onClick={go}>{cta}</Button></div>
    </div>
  );
  return (
    <div data-screen-label="Servicio · opciones" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={v.nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">{cuerpo}</div>
        {pie}
      </div>
    </div>
  );
}

/* Hojas «Tu vehículo» y «Tu casa» (diseño vehVals / casaVals). */
function Marco({ v, titulo, sub, children, pie }: { v: Of; titulo: string; sub: string; children: React.ReactNode; pie: React.ReactNode }) {
  return (
    <div data-screen-label={v.auto ? "Mi vehículo" : "Mi casa"} className="fixed inset-0 z-[70]">
      <div onClick={() => v.setSheet(null)} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={titulo} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex items-start gap-3 border-b border-ink/[.07] px-5 pb-3.5 pt-5">
          <div className="min-w-0 flex-1"><div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{titulo}</div><div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{sub}</div></div>
          <button type="button" aria-label={v.E2("Cerrar", "Close")} onClick={() => v.setSheet(null)} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex-none border-t border-ink/[.08] px-4 pb-[22px] pt-3 lg:pb-4">{pie}</div>
      </div>
    </div>
  );
}
const Radio = ({ on, t, s, tag, onClick }: { on: boolean; t: string; s: string; tag: string; onClick: () => void }) => (
  <button type="button" role="radio" aria-checked={on} onClick={onClick} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
    <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{t}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{s}</span></span>
    <span className="flex-none font-mono text-[8.5px] font-bold tracking-[0.1em] text-open-text">{tag}</span>
  </button>
);
const Chips = ({ k, items, help }: { k: string; items: { l: string; on: boolean; onClick: () => void }[]; help?: string }) => (
  <div><div className={K}>{k}</div><div className="mt-2 flex flex-wrap gap-2">{items.map((x) => <Chip key={x.l} variant={x.on ? "selected" : "filter"} onClick={x.onClick}>{x.l}</Chip>)}</div>{help && <div className="mt-2 rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{help}</div>}</div>
);

export function HojaVehiculo({ v }: { v: Of }) {
  const { E2, es } = v;
  const [modo, setModo] = useState<"list" | "form">(v.vehs.length ? "list" : "form");
  const [f, setF] = useState<{ mk: string; model: string; other: string; y: number | null; mi: string; sz: string; tire: string; mkOpen: boolean }>({ mk: "", model: "", other: "", y: null, mi: "", sz: "", tire: "", mkOpen: false });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  if (v.sheet !== "veh") return null;
  const M = MODELOS[f.mk], modelo = M ? f.model : f.other.trim(), can = !!(f.mk && f.y && f.sz && modelo.length >= 1);
  const guardar = async () => { if (!can || busy) return; setBusy(true); setErr("");
    const r = await vehiculoGuardar({ year: f.y!, make: f.mk, model: modelo, mileage: f.mi ? Number(f.mi) : null, size: f.sz, tire: f.tire || null }).catch(() => null); setBusy(false);
    if (r?.ok) { v.setVehs(r.lista); v.setSheet(null); } else setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo guardar.", "Could not save.")); };
  const elegir = async (id: string) => { const r = await vehiculoElegir(id).catch(() => null); if (r?.ok) v.setVehs(r.lista); };
  const lista = modo === "list" && v.vehs.length > 0;
  return (
    <Marco v={v} titulo={E2("Tu vehículo", "Your vehicle")} sub={E2("Los talleres lo usan para el precio, el estimado y la garantía.", "Shops use it for the price, the estimate and the warranty.")}
      pie={<div className="flex">{lista ? <Button block onClick={() => v.setSheet(null)}>{E2("Listo", "Done")}</Button> : <Button block disabled={!can || busy} onClick={() => void guardar()}>{busy ? E2("Guardando…", "Saving…") : E2("Guardar vehículo", "Save vehicle")}</Button>}</div>}>
      {err && <div role="alert" className="rounded-[12px] bg-danger/[.08] px-3 py-2.5 text-[12.5px] font-semibold text-danger">{err}</div>}
      {lista ? (<>
        <div role="radiogroup" aria-label={E2("Tus vehículos", "Your vehicles")} className="flex flex-col gap-2">{v.vehs.map((x) => <Radio key={x.id} on={v.veh?.id === x.id} t={vehName(x, es)} s={vehMeta(x, es)} tag={E2("EN TU CUENTA", "IN YOUR ACCOUNT")} onClick={() => void elegir(x.id)} />)}</div>
        <div className="flex"><Button variant="secondary" icon="plus" onClick={() => setModo("form")}>{E2("Agregar otro vehículo", "Add another vehicle")}</Button></div>
      </>) : (<>
        {v.vehs.length > 0 && <button type="button" onClick={() => setModo("list")} className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-bold text-action"><Icon name="chevronLeft" size={14} />{E2("Tus vehículos", "Your vehicles")}</button>}
        <Chips k={E2("MARCA", "MAKE")} items={[...TOPV.map((k) => ({ l: mkName(k, es), on: f.mk === k, onClick: () => setF({ ...f, mk: k, model: "", other: "", tire: "", mkOpen: false }) })),
          { l: f.mk && !TOPV.includes(f.mk) ? `${mkName(f.mk, es)} ▾` : E2("Otra marca ▾", "Other make ▾"), on: !!f.mk && !TOPV.includes(f.mk), onClick: () => setF({ ...f, mkOpen: !f.mkOpen }) }]} />
        {f.mkOpen && <select aria-label={E2("Marca", "Make")} value={f.mk} onChange={(e) => setF({ ...f, mk: e.target.value, model: "", other: "", tire: "", mkOpen: false })} className="h-11 rounded-[13px] border border-ink/[.12] bg-white px-3 text-[13.5px] font-semibold">
          <option value="">{E2("Elige la marca", "Pick the make")}</option>{MARCAS.filter((m) => !TOPV.includes(m[0])).map(([k, l]) => <option key={k} value={k}>{k === "otra" ? E2("Otra marca", "Other make") : l}</option>)}</select>}
        {M ? <Chips k={E2("MODELO", "MODEL")} items={M.map(([n, sz, tire]) => ({ l: n, on: f.model === n, onClick: () => setF({ ...f, model: n, sz, tire }) }))} />
          : f.mk ? <div><div className={K}>{f.mk === "otra" ? E2("MARCA Y MODELO", "MAKE AND MODEL") : E2("MODELO", "MODEL")}</div><input aria-label={E2("Modelo", "Model")} value={f.other} onChange={(e) => setF({ ...f, other: e.target.value.slice(0, 40) })} placeholder={f.mk === "otra" ? E2("Ej.: Suzuki Grand Vitara", "E.g. Suzuki Grand Vitara") : E2("Escríbelo", "Type it")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 text-[13.5px] font-semibold outline-none" /></div> : null}
        <Chips k={E2("AÑO", "YEAR")} items={Array.from({ length: 27 }, (_, i) => new Date().getFullYear() - i).map((y) => ({ l: String(y), on: f.y === y, onClick: () => setF({ ...f, y }) }))} />
        <div><div className={K}>{E2("MILLAJE · OPCIONAL", "MILEAGE · OPTIONAL")}</div><input aria-label={E2("Millaje", "Mileage")} inputMode="numeric" value={f.mi} onChange={(e) => setF({ ...f, mi: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder={E2("Ej.: 84200", "E.g. 84200")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 font-mono text-[13.5px] font-bold outline-none" /></div>
        <Chips k={E2("TIPO", "TYPE")} items={(["c", "s", "v", "m", "d"] as const).map((k) => ({ l: SZ[k]![es ? 0 : 1], on: f.sz === k, onClick: () => setF({ ...f, sz: k }) }))} />
        <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Se guarda en tu cuenta. El precio, el estimado y la garantía van con tu vehículo.", "Saved to your account. The price, estimate and warranty go with your vehicle.")}</div>
      </>)}
    </Marco>
  );
}

export function HojaCasa({ v }: { v: Of }) {
  const { E2, es } = v;
  const [modo, setModo] = useState<"list" | "form">(v.casas.length ? "list" : "form");
  const [f, setF] = useState<Record<string, string>>({ address: v.op.dirs[0]?.id ?? "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  if (v.sheet !== "casa") return null;
  const ch = (key: string, L: [string, string, string][]) => L.map(([k, a, b]) => ({ l: es ? a : b, on: f[key] === k, onClick: () => setF({ ...f, [key]: f[key] === k ? "" : k }) }));
  const can = !!(f.address && f.kind && f.tenure);
  const guardar = async () => { if (!can || busy) return; setBusy(true); setErr("");
    const r = await casaGuardar(v.op.negocio.id, { address: f.address!, kind: f.kind!, tenure: f.tenure!, beds: f.beds ? Number(f.beds.replace("+", "")) : null, baths: f.baths ? Number(f.baths.replace("+", "")) : null, sqft: f.sqft ? Number(f.sqft) : null,
      year: f.year || null, pets: f.pets || null, heat: f.heat || null, heatAge: f.heatAge || null, wh: f.wh || null, whAge: f.whAge || null, access: f.access || null }).catch(() => null); setBusy(false);
    if (r?.ok) { v.setCasas(r.lista); v.setSheet(null); } else setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo guardar.", "Could not save.")); };
  const elegir = async (id: string) => { const r = await casaElegir(v.op.negocio.id, id).catch(() => null); if (r?.ok) v.setCasas(r.lista); };
  const lista = modo === "list" && v.casas.length > 0, volver = encodeURIComponent(typeof location !== "undefined" ? location.pathname + location.search : "/");
  return (
    <Marco v={v} titulo={E2("Tu casa", "Your home")} sub={E2("Con esto te decimos quién llega hasta ahí y el negocio llega preparado.", "With this we tell you who reaches you and the business comes prepared.")}
      pie={<div className="flex">{lista ? <Button block onClick={() => v.setSheet(null)}>{E2("Listo", "Done")}</Button> : <Button block disabled={!can || busy} onClick={() => void guardar()}>{busy ? E2("Guardando…", "Saving…") : E2("Guardar casa", "Save home")}</Button>}</div>}>
      {err && <div role="alert" className="rounded-[12px] bg-danger/[.08] px-3 py-2.5 text-[12.5px] font-semibold text-danger">{err}</div>}
      {lista ? (<>
        <div role="radiogroup" aria-label={E2("Tus casas", "Your homes")} className="flex flex-col gap-2">{v.casas.map((x) => <Radio key={x.id} on={v.casa?.id === x.id} t={x.dir} s={casaMeta(x, es)} tag={E2("EN TU CUENTA", "IN YOUR ACCOUNT")} onClick={() => void elegir(x.id)} />)}</div>
        <div className="flex"><Button variant="secondary" icon="plus" onClick={() => setModo("form")}>{E2("Agregar otra casa", "Add another home")}</Button></div>
      </>) : (<>
        {v.casas.length > 0 && <button type="button" onClick={() => setModo("list")} className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-bold text-action"><Icon name="chevronLeft" size={14} />{E2("Tus casas", "Your homes")}</button>}
        <div><div className={K}>{E2("DIRECCIÓN", "ADDRESS")}</div>
          {v.op.dirs.length ? <select aria-label={E2("Dirección", "Address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="mt-2 h-11 w-full rounded-[13px] border border-ink/[.12] bg-white px-3 text-[13.5px] font-semibold">{v.op.dirs.map((d) => <option key={d.id} value={d.id}>{d.t}</option>)}</select> : null}
          <a href={`/cuenta/direcciones/nueva?volver=${volver}`} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-action"><Icon name="plus" size={14} />{v.op.dirs.length ? E2("Otra dirección", "Another address") : E2("Agrega tu dirección", "Add your address")}</a></div>
        <Chips k={E2("TIPO", "TYPE")} items={ch("kind", TIPO)} />
        <Chips k={E2("¿ERES DUEÑO?", "DO YOU OWN IT?")} items={ch("tenure", OWN)} help={f.tenure === "inq" ? E2("Para arreglos necesitas el permiso de tu landlord. Te lo pedimos en el Booking; algunos negocios solo trabajan con dueños.", "For repairs you need your landlord’s permission. We ask for it when you book; some businesses only work with owners.") : undefined} />
        <Chips k={E2("CUARTOS", "BEDROOMS")} items={["1", "2", "3", "4", "5+"].map((x) => ({ l: x, on: f.beds === x, onClick: () => setF({ ...f, beds: f.beds === x ? "" : x }) }))} />
        <Chips k={E2("BAÑOS", "BATHROOMS")} items={["1", "1.5", "2", "3+"].map((x) => ({ l: x, on: f.baths === x, onClick: () => setF({ ...f, baths: f.baths === x ? "" : x }) }))} />
        <div><div className={K}>{E2("PIES² · OPCIONAL", "SQ FT · OPTIONAL")}</div><input aria-label={E2("Pies cuadrados", "Square feet")} inputMode="numeric" value={f.sqft ?? ""} onChange={(e) => setF({ ...f, sqft: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder={E2("Ej.: 1400", "E.g. 1400")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 font-mono text-[13.5px] font-bold outline-none" /></div>
        <Chips k={E2("AÑO DE LA CASA", "YEAR BUILT")} items={ch("year", YR)} help={f.year === "pre50" || f.year === "50" ? E2("Casas de antes de 1978 pueden tener pintura con plomo: el negocio lo tiene en cuenta al lijar o romper paredes.", "Homes built before 1978 may have lead paint: the business accounts for it when sanding or opening walls.") : undefined} />
        <Chips k={E2("MASCOTAS", "PETS")} items={ch("pets", PETS)} />
        <Chips k={E2("CALEFACCIÓN", "HEATING")} items={ch("heat", HEAT)} />
        <Chips k={E2("EDAD DE LA CALEFACCIÓN", "HEATING AGE")} items={ch("heatAge", AGE)} />
        <Chips k={E2("CALENTADOR DE AGUA", "WATER HEATER")} items={ch("wh", WH)} />
        <Chips k={E2("EDAD DEL CALENTADOR", "WATER HEATER AGE")} items={ch("whAge", AGE)} />
        <div><div className={K}>{E2("DÓNDE ESTACIONAR Y CÓMO ENTRAR · OPCIONAL", "PARKING AND ACCESS · OPTIONAL")}</div><input aria-label={E2("Cómo entrar", "Access")} value={f.access ?? ""} onChange={(e) => setF({ ...f, access: e.target.value.slice(0, 120) })} placeholder={E2("Ej.: entrada al lado, timbre no sirve", "E.g. side driveway, doorbell broken")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 text-[13.5px] font-semibold outline-none" /></div>
        <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Se guarda en tu cuenta. La dirección exacta solo la ve el negocio que confirma tu visita.", "Saved to your account. Only the business that confirms your visit sees the exact address.")}</div>
      </>)}
    </Marco>
  );
}

export function OfResumen({ v, desk, onAll }: { v: Of; desk: boolean; onAll?: () => void }) {
  const { E2 } = v;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Servicios", "Services")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
      </div>
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div>
    </div>
  );
}
export function OfRiel({ v, onCta }: { v: Of; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.04em]">{v.desde ? `${E2("Desde ", "From ")}${dinero(v.desde)}` : E2("Servicios", "Services")}</div>
      <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.nota}</div>
      {v.op.can && <div className="flex"><Button icon="calendar" block onClick={onCta}>Booking</Button></div>}
    </div>
  );
}
export function OfBarra({ v, onCta }: { v: Of; onCta: () => void }) {
  const { E2 } = v;
  if (v.hoja || v.sheet || !v.op.can) return null;
  return (
    <div data-screen-label="Ficha · barra de citas" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde ? `${E2("Desde ", "From ")}${dinero(v.desde)}` : E2("Servicios", "Services")}</div>
        <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${v.riel[2]!.k} ${v.riel[2]!.v}`.toUpperCase()}</div>
      </div>
      <Button icon="calendar" onClick={onCta}>Booking</Button>
    </div>
  );
}
