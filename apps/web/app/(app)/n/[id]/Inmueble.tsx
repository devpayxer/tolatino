"use client";
/* Ficha de Bienes Raíces (4id · prototipo neg-inm-kind.js metaOf L84–88, btnOf L90, tabL L91, post L94–142). Línea fija (nunca se suaviza):
   «Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.»; por tipo, préstamos, venta, derechos, servicios y
   comercial. VIVIENDA JUSTA (guardián viviendaJusta): toda propiedad que se pinta (lista, Resumen y hoja) lleva el pie «Igualdad de
   oportunidad en la vivienda» y la nota de los animales de servicio (pie()); la hoja dice «Nunca pagues un depósito antes de ver la
   propiedad y firmar el contrato.». De cada propiedad se ve solo la zona (ciudad y código postal): la dirección de un cuarto o de «solo
   la zona» llega al confirmar la visita (4ie). «Para mudarte» y la cuota ESTIMADA vienen del servidor. «Pedir visita» en la app llega con
   4ie: hasta entonces la hoja ofrece llamar o escribir (como 4ed antes de 4ee). */
import { useState, type MouseEvent } from "react";
import type { Bi } from "@/lib/inscripciones-comun";
import {
  ANIMALES_SERVICIO, CUOTA_NOTA, EHO, LAVANDERIA, NO_PAGUES, PROP, UTIL, alMes, cuotaTexto, mudarteTexto, porL, sinPropiedades, usd,
} from "@/lib/inmuebles-comun";
import type { InmPublica, PropPub, SvcInmPub } from "@/lib/inmuebles-publico";
import { Barra, Caja, Datos, Hoja, Icon, Lista, Nota, Renglon, Resumen, Riel, Top, stop, type Cta, type Item, type Td, type TopT } from "./Kit4i";

type Acc = { llamar: () => void; escribir: () => void; llegar: () => void; irTab: () => void };
const bi = (t: Bi, es: boolean) => (es ? t.es : t.en || t.es);
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const fecha = (iso: string, hoy: string, es: boolean) => { if (iso <= hoy) return es ? "Ya" : "Now"; const [, m, d] = iso.split("-").map(Number) as [number, number, number]; return es ? `${d} ${MES[m - 1]![0]}` : `${MES[m - 1]![1]} ${d}`; };

/* El pie de vivienda justa: va detrás de TODA propiedad que se pinta (lista, Resumen y hoja). */
function pie(es: boolean) {
  return (
    <div data-screen-label="Propiedad · vivienda justa" className="flex flex-col gap-1.5 rounded-2xl border border-ink/[.08] px-4 py-3">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.1em] text-ink/60"><Icon name="home" size={14} color="rgba(11,14,18,.6)" />{bi(EHO, es).toUpperCase()}</div>
      <div className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/70">{bi(ANIMALES_SERVICIO, es)}</div>
    </div>
  );
}

export function useInm(ip: InmPublica | null, es: boolean, pro: boolean, acc: Acc) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  if (!ip) return null;
  const nm = (b: Bi | null | undefined) => (b ? bi(b, es) : "");
  const k = ip.kind, linea = nm(ip.linea), R = ip.props.filter((x) => x.deal === "renta"), V = ip.props.filter((x) => x.deal === "venta");
  const efectivo = ip.subs.includes("Compradores en efectivo");
  // metaOf (L84–88): recámaras y baños, lo de mudarse o la cuota ESTIMADA, «VER ES GRATIS».
  const cuartos = (p: PropPub) => [p.beds != null ? (p.beds === 0 ? E2("ESTUDIO", "STUDIO") : E2(`${p.beds} ${p.beds === 1 ? "RECÁMARA" : "RECÁMARAS"}`, `${p.beds} BED`)) : "",
    p.baths != null ? E2(`${String(p.baths).replace(".5", "½")} ${p.baths === 1 ? "BAÑO" : "BAÑOS"}`, `${String(p.baths).replace(".5", "½")} BATH`) : ""].filter(Boolean).join(" · ");
  const metaP = (p: PropPub) => [p.status === "pending" ? E2("APARTADA", "ON HOLD") : "", cuartos(p),
    p.deal === "renta" && p.moveIn != null ? E2(`PARA MUDARTE ${usd(p.moveIn)}`, `TO MOVE IN ${usd(p.moveIn)}`) : p.deal === "venta" && p.cuota != null ? cuotaTexto(p.cuota, p.downPct, es).toUpperCase() : "",
    E2("VER ES GRATIS", "VIEWING IS FREE")].filter(Boolean).join(" · ");
  const precioP = (p: PropPub) => (p.deal === "renta" ? `${usd(p.rent ?? 0)}${porL(p.kind, es)}` : usd(p.price ?? 0));
  const itemP = (p: PropPub): Item => ({ id: p.id, name: nm(p.name), desc: nm(p.desc), foto: p.fotos[0] ?? null, price: precioP(p), meta: metaP(p), btn: E2("Pedir visita", "Request visit") });
  // Los servicios (btnOf L90): precalificación, oferta, cita o cotización.
  const btnS = (s: SvcInmPub) => (k === "hipo" ? E2("Pedir precalificación", "Get pre-qualified") : efectivo ? E2("Pedir oferta", "Get an offer") : !s.cents ? E2("Pedir cita", "Book") : E2("Pedir cotización", "Get a quote"));
  const itemS = (s: SvcInmPub): Item => ({ id: s.id, name: nm(s.name), desc: nm(s.desc), foto: s.foto, price: s.cents ? usd(s.cents) : E2("Gratis", "Free"), meta: s.cents ? E2("PRECIO TOTAL", "TOTAL PRICE") : E2("GRATIS · SIN COMPROMISO", "FREE · NO COMMITMENT"), btn: btnS(s) });
  const secs = [{ title: R.some((x) => x.kind === "cuarto" || x.kind === "compartida") && R.every((x) => x.kind === "cuarto" || x.kind === "compartida") ? E2("CUARTOS", "ROOMS") : E2("PARA RENTAR", "FOR RENT"), items: R.map(itemP) },
    { title: E2("EN VENTA", "FOR SALE"), items: V.map(itemP) },
    ...ip.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: ip.servicios.filter((s) => s.sec === sc.id).map(itemS) })),
    { title: E2("SERVICIOS", "SERVICES"), items: ip.servicios.filter((s) => !ip.secciones.some((sc) => sc.id === s.sec)).map(itemS) }].filter((x) => x.items.length);
  // tabL (L91).
  const tabL = ({ rent: ["Propiedades", "Properties"], cuarto: ["Cuartos", "Rooms"], venta: ["En venta", "For sale"], hipo: ["Préstamos", "Loans"], serv: ["Servicios", "Services"], comercial: ["Locales", "Spaces"], alm: ["Bodegas", "Units"], derechos: ["Ayuda", "Help"] } as Record<string, [string, string]>)[k]![es ? 0 : 1];
  // La tarjeta de arriba (L126–129).
  const sinSsn = R.length ? R.every((x) => !x.ssnReq) : ip.itin;
  const top: TopT = k === "hipo" ? { k: E2("¿ME GARANTIZAN LA APROBACIÓN?", "IS APPROVAL GUARANTEED?"), v: E2("No, nadie puede", "No, no one can"), s: E2("Te dicen cuánto te prestan después de ver tus papeles.", "They tell you how much after reviewing your papers.") }
    : k === "venta" ? { k: E2("¿CUÁNTO NECESITO?", "HOW MUCH DO I NEED?"), v: E2("Enganche + cierre", "Down payment + closing"), s: E2("El cierre es de 3 a 5 % del precio; te lo dan por escrito.", "Closing is 3 to 5% of the price; you get it in writing.") }
    : k === "derechos" ? { k: E2("¿CUESTA LA ORIENTACIÓN?", "DOES GUIDANCE COST?"), v: E2("No, es gratis", "No, it is free"), s: linea }
    : k === "serv" || k === "alm" || k === "comercial" ? { k: E2("¿EL PRECIO ES EL TOTAL?", "IS THE PRICE THE TOTAL?"), v: E2("Sí, por escrito", "Yes, in writing"), s: E2("Lo que va aparte se dice antes.", "Anything extra is stated first.") }
    : { k: E2("¿PIDEN SEGURO SOCIAL?", "DO THEY ASK FOR SSN?"), v: sinSsn ? "No" : E2("Sí, o ITIN", "Yes, or ITIN"), s: E2("Ver la propiedad es gratis.", "Viewing is free.") };
  // Notas (máx. 4; L122–125). El sello NMLS solo de una licencia verificada; «no afecta tu crédito» solo si el prestamista lo dice (§6 #8).
  const notes: [string, string][] = [["home", linea]];
  if (k === "rent" || k === "cuarto") notes.push(["check", sinSsn ? E2("No piden seguro social: con ITIN, pasaporte o carta del trabajo.", "No SSN required: ITIN, passport or work letter.") : E2("Cada anuncio dice qué papeles piden.", "Each listing says which papers are required.")], ["shield", bi(NO_PAGUES, es)]);
  if (k === "venta" && ip.sinCom) notes.push(["dollar", E2("Como comprador no pagas comisión; la paga el vendedor.", "As a buyer you pay no commission; the seller pays it.")]);
  if (k === "hipo" && ip.nmls) notes.push(["verified", E2(`Licencia NMLS ${ip.nmls}. Puedes buscarla en nmlsconsumeraccess.org.`, `NMLS license ${ip.nmls}. You can look it up at nmlsconsumeraccess.org.`)]);
  for (const s of ip.sellos) if (s.kind !== "nmls_inm") notes.push(["verified", `${nm(s.titulo)}${s.numero ? ` · ${s.etiqueta} ${s.numero}` : ""}`]);
  notes.push(["calendar", k === "hipo" ? (ip.softPull ? E2("Precalificar no afecta tu crédito ni te compromete.", "Pre-qualifying does not hurt your credit or commit you.") : E2("Precalificar es gratis y no te compromete.", "Pre-qualifying is free and commits you to nothing."))
    : E2("Pedir una visita o una cita es gratis y no te compromete.", "Requesting a visit or booking is free and commits you to nothing.")]);
  if (!pro) notes.unshift(["phone", E2("Para ver la propiedad o pedir la cita, llama o escribe al lugar.", "To see the property or book, call or message the place.")]);
  // fromLabel, barra y CTA (L129–138).
  const minRent = R.length ? Math.min(...R.map((x) => x.rent ?? 0)) : null, vMin = V.length ? Math.min(...V.map((x) => x.price ?? 0)) : null, sMin = ip.servicios.filter((x) => x.cents > 0).map((x) => x.cents).sort((a, b) => a - b)[0];
  const desde = pro ? (k === "rent" || k === "comercial" || k === "alm" ? (minRent != null ? `${E2("Desde", "From")} ${usd(minRent)}${E2("/mes", "/mo")}` : E2("Ver es gratis", "Viewing is free"))
      : k === "cuarto" ? (minRent != null ? `${usd(minRent)}${E2("/mes", "/mo")}${ip.util ? E2(" con todo", " all in") : ""}` : E2("Ver es gratis", "Viewing is free"))
      : k === "venta" ? (vMin != null ? `${E2("Desde", "From")} ${usd(vMin)}` : E2("Asesoría gratis", "Free advice")) : k === "hipo" ? E2("Precalificación gratis", "Free pre-qualification")
      : sMin ? `${E2("Desde", "From")} ${usd(sMin)}` : E2("Gratis", "Free"))
    : k === "derechos" ? E2("Gratis · llama o pasa", "Free · call or stop by") : k === "alm" ? E2("Llama o pasa", "Call or stop by") : k === "comercial" ? E2("Llama para ver el local", "Call to see the space") : E2("Llama", "Call");
  const llamarC: Cta = ip.negocio.telefono ? { l: E2("Llamar", "Call"), icon: "phone", go: acc.llamar } : { l: E2("Escribir", "Message"), icon: "bubble", go: acc.escribir };
  const cta: Cta = !pro || k === "derechos" ? llamarC : k === "hipo" ? { l: E2("Pedir precalificación", "Get pre-qualified"), icon: "calendar", go: acc.irTab }
    : k === "venta" ? { l: E2("Ver casas", "See homes"), icon: "home", go: acc.irTab } : k === "serv" ? { l: efectivo ? E2("Pedir oferta", "Get an offer") : E2("Pedir cotización", "Get a quote"), icon: "calendar", go: acc.irTab }
    : k === "alm" ? { l: E2("Ver bodegas", "See units"), icon: "key", go: acc.irTab } : { l: E2("Pedir visita", "Request visit"), icon: "key", go: acc.irTab };
  const libre = ip.libre ?? R.map((x) => x.disponible).filter((x): x is string => !!x).sort()[0] ?? null;
  const sub = k === "rent" ? `${R.filter((x) => x.status === "available").length} ${E2("DISPONIBLES", "AVAILABLE")}${sinSsn ? E2(" · SIN SEGURO SOCIAL", " · NO SSN") : ""}`
    : k === "cuarto" && libre ? E2(`LIBRE DESDE EL ${fecha(libre, ip.hoy, true).toUpperCase()}`, `FREE FROM ${fecha(libre, ip.hoy, false).toUpperCase()}`)
    : k === "hipo" ? `${ip.itin ? E2("CON ITIN · ", "WITH ITIN · ") : ""}${E2("ENGANCHE DESDE", "DOWN FROM")} ${String(ip.minDown).replace(/\.0$/, "")} %` : "";
  return { ip, es, E2, nm, pro, secs, notes: notes.slice(0, 4), desde, linea, tabL, top, hoja, cta, llamarC, acc, sub, td: ip.td ?? [], hayProps: ip.props.length > 0,
    abrir: (id: string, ev?: MouseEvent) => { stop(ev); if (pro) setHoja(id); }, cerrar: () => setHoja(null),
    primeros: [...ip.props.map(itemP), ...ip.servicios.map(itemS)].slice(0, pro ? 4 : 5), itemP, itemS, cuartos };
}
export type InmV = NonNullable<ReturnType<typeof useInm>>;

export function InmTab({ v, desk }: { v: InmV; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · bienes raíces · desktop" : "Ficha · bienes raíces"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <Top top={v.top} label="bienes raíces" />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <Lista secs={v.secs} desk={desk} can={v.pro} abrir={v.abrir} vacio={sinPropiedades(v.ip.kind) ? v.E2("Todavía no publica sus servicios en To’Latino: pregúntalos al lugar.", "No services posted on To’Latino yet: ask the place.") : v.E2("Ahora no tiene propiedades disponibles en To’Latino.", "No properties available on To’Latino right now.")}>
        {v.hayProps && pie(v.es)}
      </Lista>
    </div>
  );
}

/* La hoja de una propiedad (L132–133): fotos, «Para mudarte: renta + depósito = total», lo que incluye, lo que piden, la zona, la línea
   contra estafas y el pie de vivienda justa. La de un servicio: su texto y lo que va aparte. */
export function InmHoja({ v }: { v: InmV }) {
  const { ip, E2, nm, es } = v;
  if (!v.hoja) return null;
  const p = ip.props.find((x) => x.id === v.hoja), s = p ? null : ip.servicios.find((x) => x.id === v.hoja);
  if (!p && !s) return null;
  const cta: Cta = { l: v.llamarC.l, icon: v.llamarC.icon, go: () => { v.cerrar(); v.llamarC.go(); } };
  if (s) {
    const it = v.itemS(s);
    return (
      <Hoja label="Servicio · bienes raíces" titulo={it.name} fotos={[s.foto ?? ip.negocio.foto].filter((x): x is string => !!x)} price={it.price} meta={it.meta} desc={it.desc} cerrar={v.cerrar} cerrarL={E2("Cerrar", "Close")}
        pieK={s.cents ? E2("PRECIO TOTAL", "TOTAL PRICE") : E2("COSTO", "COST")} pieV={it.price} cta={cta}>
        {s.no.length > 0 && <Caja k={E2("BUENO SABER", "GOOD TO KNOW")}>{s.no.map((z) => <Renglon key={z.es} t={nm(z)} />)}</Caja>}
        <Nota ic="check" t={`${s.cents ? E2("El precio es el total; lo que va aparte se dice antes. ", "The price is the total; anything extra is stated first. ") : E2("Es gratis y no te compromete. ", "It is free and commits you to nothing. ")}${E2("Por ahora se pide llamando o escribiendo al lugar.", "For now, request it by calling or messaging the place.")}`} />
      </Hoja>
    );
  }
  const x = p!, it = v.itemP(x), mudar = x.deal === "renta" && alMes(x.kind) && x.moveIn != null;
  const datos: Td[] = [
    ...(x.beds != null ? [{ k: E2("RECÁMARAS", "BEDROOMS"), v: x.beds === 0 ? E2("Estudio", "Studio") : String(x.beds) }] : []),
    ...(x.baths != null ? [{ k: E2("BAÑOS", "BATHS"), v: String(x.baths).replace(".5", "½") }] : []),
    ...(x.sqft != null ? [{ k: E2("PIES²", "SQ FT"), v: x.sqft.toLocaleString("en-US") }] : []),
    ...(x.disponible ? [{ k: E2("DESDE", "AVAILABLE"), v: fecha(x.disponible, ip.hoy, es) }] : []),
    { k: E2("TIPO", "TYPE"), v: PROP[x.kind][es ? "es" : "en"] },
    ...(x.deal === "renta" ? [{ k: E2("MASCOTAS", "PETS"), v: x.pets ? E2("Sí", "Yes") : "No" }, { k: E2("AMUEBLADO", "FURNISHED"), v: x.furnished ? E2("Sí", "Yes") : "No" }] : []),
    ...(x.laundry !== "no" ? [{ k: E2("LAVANDERÍA", "LAUNDRY"), v: (LAVANDERIA.find((l) => l[0] === x.laundry) ?? LAVANDERIA[0]!)[es ? 1 : 2] }] : []),
    ...(x.parking ? [{ k: E2("PARQUEO", "PARKING"), v: E2("Sí", "Yes") }] : []),
    ...(x.s8 ? [{ k: "SECTION 8", v: E2("Aceptan", "Accepted") }] : []),
  ];
  const zona = `${ip.negocio.ciudad}${x.zip ? ` · ${x.zip}` : ""}`;
  return (
    <Hoja label="Propiedad · hoja" titulo={it.name} fotos={x.fotos.length ? x.fotos : [ip.negocio.foto].filter((u): u is string => !!u)} price={it.price} meta={it.meta} desc={it.desc} cerrar={v.cerrar} cerrarL={E2("Cerrar", "Close")}
      pieK={mudar ? E2("PARA MUDARTE", "TO MOVE IN") : E2("PRECIO", "PRICE")} pieV={mudar ? usd(x.moveIn!) : it.price} cta={cta}>
      {mudar && (
        <Caja k={E2("PARA MUDARTE", "TO MOVE IN")} label="Propiedad · para mudarte">
          <div className="mt-1.5 text-pretty text-[14px] font-bold leading-[1.45]">{mudarteTexto(x, es)}</div>
          <div className="mt-1.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{E2("Nada fuera de lo publicado. Ver la propiedad es gratis.", "Nothing beyond what is posted. Viewing is free.")}</div>
        </Caja>)}
      {x.deal === "venta" && x.cuota != null && (
        <Caja k={E2("CUOTA ESTIMADA", "ESTIMATED PAYMENT")} label="Propiedad · cuota estimada">
          <div className="mt-1.5 text-pretty text-[14px] font-bold leading-[1.45]">{cuotaTexto(x.cuota, x.downPct, es)}</div>
          <div className="mt-1.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{bi(CUOTA_NOTA, es)}</div>
        </Caja>)}
      <Datos L={datos} />
      {x.utilities.length > 0 && <Caja k={E2("INCLUYE", "INCLUDES")}>{x.utilities.map((u) => <Renglon key={u} t={(UTIL.find((z) => z[0] === u) ?? [u, u, u])[es ? 1 : 2]} ok />)}</Caja>}
      <Caja k={E2("LO QUE PIDEN", "WHAT THEY ASK FOR")} label="Propiedad · lo que piden">
        <Renglon t={x.ssnReq ? E2("Seguro social o ITIN.", "SSN or ITIN.") : E2("Sin seguro social: aceptan ITIN, pasaporte o carta del trabajo.", "No SSN: they accept ITIN, passport or a work letter.")} ok={!x.ssnReq} />
        {x.papers && nm(x.papers) && <Renglon t={nm(x.papers)} />}
        <div className="mt-2 text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Los papeles se llevan en persona; nunca se mandan por la app.", "Papers are brought in person; never sent through the app.")}</div>
      </Caja>
      {x.lease && nm(x.lease) && <Caja k={E2("CONTRATO", "LEASE")}><Renglon t={nm(x.lease)} /></Caja>}
      <Caja k={E2("ZONA", "AREA")} label="Propiedad · zona">
        <Renglon t={zona} />
        {x.soloZona && <div className="mt-1.5 text-pretty text-[12px] font-semibold leading-[1.5] text-ink/60">{E2("La dirección exacta te llega cuando aceptan la visita.", "The exact address arrives once the visit is accepted.")}</div>}
      </Caja>
      <Nota ic="shield" t={bi(NO_PAGUES, es)} />
      <Nota ic="key" t={E2("Ver es gratis. Por ahora la visita se pide llamando o escribiendo al lugar: te dicen las horas.", "Viewing is free. For now, request the visit by calling or messaging the place: they tell you the times.")} />
      {pie(es)}
    </Hoja>
  );
}
export function InmResumen({ v, desk, onAll }: { v: InmV; desk: boolean; onAll?: () => void }) {
  return <Resumen titulo={v.tabL} primeros={v.primeros} desk={desk} can={v.pro} abrir={v.abrir} onAll={onAll} verTodo={v.E2("Ver todo", "See all")}
    top={v.pro ? <Top top={v.top} label="bienes raíces" /> : undefined}
    pie={<>{v.hayProps && <div className="mt-3">{pie(v.es)}</div>}{!v.pro && <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{v.E2("Para ver la propiedad o pedir la cita, llama o escribe al lugar.", "To see the property or book, call or message the place.")}</div>}</>} />;
}
export function InmRiel({ v }: { v: InmV }) {
  return <Riel desde={v.desde} td={v.pro ? v.td : []} linea={v.linea} cta={v.cta} label="bienes raíces" />;
}
export function InmBarra({ v }: { v: InmV }) {
  if (v.hoja) return null;
  return <Barra desde={v.desde} sub={v.sub} cta={v.cta} label="bienes raíces" />;
}
