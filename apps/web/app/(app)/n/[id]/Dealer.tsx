"use client";
/* Ficha de Venta de Autos (4id · prototipo neg-dealer-kind.js metaOf L101–104, btnOf L106, tabL L107, post L110–160). Línea fija (nunca se
   suaviza): «El precio en la puerta: con impuestos, placas y cargos del dealer, antes de firmar.». Cada carro dice su total EN LA PUERTA
   (lo calculó el servidor), millaje, título e historial; el pago de ejemplo sale solo con enganche, tasa (APR) y meses juntos y dice
   «estimado, sujeto a aprobación» (pagoTexto / bhphTexto; Regulation Z); un título salvage dice SIEMPRE su línea (notasCarro). 4ie: «Prueba de
   manejo», «Pedir oferta», «Pedir precalificación» y «Pedir cita» llevan a la solicitud (/n/{id}/ver); con Free, la fila va directo. */
import { useEffect, useState, type MouseEvent } from "react";
import type { Bi } from "@/lib/inscripciones-comun";
import {
  DRIVE, FUEL, NO_OBLIGATORIA, SIN_GARANTIA, TITULO, TRANS, bhphTexto, notasCarro, pagoTexto, pctBp, totalPagoTexto, usd,
} from "@/lib/autos-comun";
import type { AutosPublica, CarroPub, SvcAutoPub } from "@/lib/autos-publico";
import { Barra, Caja, Datos, Hoja, Lista, Nota, Renglon, Resumen, Riel, Top, stop, type Cta, type Item, type Td, type TopT } from "./Kit4i";

type Acc = { llamar: () => void; escribir: () => void; llegar: () => void; irTab: () => void; pedir: (href: string) => void };
const bi = (t: Bi, es: boolean) => (es ? t.es : t.en || t.es);
const VENDEN = ["lot", "new", "bhph", "work", "moto", "rv", "lux", "salv", "broker"];
/* ¿CUÁNTO PAGO EN TOTAL?: el porcentaje es el de la ciudad (tax_rules, viene del servidor), nunca escrito a mano. */
const formulaPuerta = (p: Pick<AutosPublica, "taxBp">, es: boolean) =>
  es ? `Precio + ${p.taxBp != null ? pctBp(p.taxBp) : "impuesto"} + placas + cargo` : `Price + ${p.taxBp != null ? pctBp(p.taxBp).replace(" %", "%") : "tax"} + tags + fee`;

export function useDealer(ap: AutosPublica | null, es: boolean, pro: boolean, acc: Acc) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  // 9m · Desde «Buscar por propiedad o por carro» (L559): ?item= abre esa hoja al llegar (si se ve en esta página).
  useEffect(() => { try { const id = new URLSearchParams(window.location.search).get("item"); if (id && /^\d{1,18}$/.test(id) && pro) setHoja(id); } catch { /* sin dirección: nada */ } }, [pro]);
  if (!ap) return null;
  const nm = (b: Bi | null | undefined) => (b ? bi(b, es) : "");
  const k = ap.kind, linea = nm(ap.linea), vende = VENDEN.includes(k) && !(k === "broker" && !ap.pro);
  // metaOf (L101–104): EN LA PUERTA $X · N MILLAS · TÍTULO; un salvage lleva su línea en la fila (notasCarro la pone primero).
  const metaC = (x: CarroPub) => [x.status === "pending" ? E2("APARTADO EN PERSONA", "HELD IN PERSON") : "", E2(`EN LA PUERTA ${usd(x.puerta.otd)}`, `OUT THE DOOR ${usd(x.puerta.otd)}`),
    x.miles != null ? E2(`${x.miles.toLocaleString("en-US")} MILLAS`, `${x.miles.toLocaleString("en-US")} MILES`) : x.hours != null ? E2(`${x.hours.toLocaleString("en-US")} HORAS DE MOTOR`, `${x.hours.toLocaleString("en-US")} ENGINE HOURS`) : "",
    TITULO[x.title][es ? 0 : 1].toUpperCase()].filter(Boolean).join(" · ");
  const itemC = (x: CarroPub): Item => ({ id: x.id, name: nm(x.name), desc: nm(x.desc), foto: x.fotos[0] ?? null, price: usd(x.puerta.price), meta: metaC(x),
    aviso: x.title === "salvage" ? notasCarro(x, es)[0] : undefined, btn: k === "mayor" ? (pro ? E2("Ver en la subasta", "See at auction") : "") : E2("Prueba de manejo", "Test drive") });
  // 4ie · Se pide en la app: la prueba de manejo de cada carro y los servicios (oferta, precalificación o cita). La subasta, llamando.
  const pide = k !== "mayor", pedirHref = (id: string) => `/n/${ap.negocio.id}/ver?item=${id}`;
  const btnS = (s: SvcAutoPub) => (k === "cash" ? E2("Pedir oferta", "Get an offer") : k === "fin" ? E2("Pedir precalificación", "Get pre-qualified") : E2("Pedir cita", "Book"));
  const itemS = (s: SvcAutoPub): Item => ({ id: s.id, name: nm(s.name), desc: nm(s.desc), foto: s.foto, price: s.cents ? usd(s.cents) : E2("Gratis", "Free"), meta: s.cents ? E2("PRECIO TOTAL", "TOTAL PRICE") : E2("GRATIS · SIN COMPROMISO", "FREE · NO COMMITMENT"), btn: btnS(s) });
  // tabL (L107).
  const tabL = k === "mayor" ? E2("Subasta", "Auction") : vende ? (k === "broker" ? E2("Carros", "Cars") : k === "moto" ? E2("En la tienda", "In store") : E2("En el lote", "On the lot")) : E2("Servicios", "Services");
  const secs = [{ title: tabL.toUpperCase(), items: ap.carros.map(itemC) },
    ...ap.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: ap.servicios.filter((s) => s.sec === sc.id).map(itemS) })),
    { title: E2("SERVICIOS", "SERVICES"), items: ap.servicios.filter((s) => !ap.secciones.some((sc) => sc.id === s.sec)).map(itemS) }].filter((x) => x.items.length);
  // La tarjeta de arriba (L146–148): el porcentaje es el de la ciudad (tax_rules), nunca escrito a mano.
  const top: TopT = k === "fin" ? { k: E2("¿ME GARANTIZAN LA APROBACIÓN?", "IS APPROVAL GUARANTEED?"), v: E2("No, nadie puede", "No, no one can"), s: E2("La tasa y el total te los dan por escrito.", "Rate and total are put in writing.") }
    : vende ? { k: E2("¿CUÁNTO PAGO EN TOTAL?", "WHAT DO I PAY IN TOTAL?"), v: formulaPuerta(ap, es), s: E2("El total en la puerta sale en cada carro, antes de firmar.", "Each car shows the out-the-door total, before you sign.") }
    : { k: E2("¿EL PRECIO ES EL TOTAL?", "IS THE PRICE THE TOTAL?"), v: E2("Sí, por escrito", "Yes, in writing"), s: E2("Lo que va aparte se dice antes.", "Anything extra is stated first.") };
  const dl = ap.sellos.find((s) => s.kind === "pa_dealer");
  const top2: TopT = dl ? { k: nm(dl.titulo).toUpperCase(), v: `${dl.etiqueta} ${dl.numero ?? ""}`.trim(), s: E2("Verificada por To’Latino con el registro público.", "Verified by To’Latino against the public registry.") } : null;
  // Notas (máx. 4; L142–145).
  const notes: [string, string][] = [["car", linea]];
  if (vende) notes.push(["check", E2("Cada carro dice millaje, título, historial y el total en la puerta.", "Each car shows mileage, title, history and the out-the-door total.")]);
  if (ap.itin && vende) notes.push(["card", E2("Con ITIN: la tasa y los meses por escrito antes de firmar.", "With ITIN: rate and term in writing before signing.")]);
  if (ap.casa && vende) notes.push(["home", E2("Te llevan el carro a tu casa para la prueba.", "They bring the car to your home for the test drive.")]);
  if (k === "fin") notes.push(["shield", bi(NO_OBLIGATORIA, es)]);
  for (const s of ap.sellos) if (s.kind !== "pa_dealer") notes.push(["verified", `${nm(s.titulo)}${s.numero ? ` · ${s.etiqueta} ${s.numero}` : ""}`]);
  notes.push(["calendar", E2("Pedir la prueba o la cita es gratis y no te compromete.", "Requesting a test drive or booking is free and commits you to nothing.")]);
  if (!pro) notes.unshift(["phone", E2("Pide la prueba de manejo o la cita aquí, o llama al lugar.", "Request the test drive or booking here, or call the place.")]);
  // fromLabel, barra y CTA (L129–141, L154).
  const vMin = ap.carros.length ? Math.min(...ap.carros.map((x) => x.puerta.price)) : null, sMin = ap.servicios.filter((x) => x.cents > 0).map((x) => x.cents).sort((a, b) => a - b)[0];
  const desde = pro ? (vende && vMin != null ? `${E2("Desde", "From")} ${usd(vMin)}` : k === "fin" ? E2("Precalificación gratis", "Free pre-qualification") : sMin ? `${E2("Desde", "From")} ${usd(sMin)}` : E2("Gratis", "Free"))
    : k === "cash" ? E2("Oferta gratis · llama", "Free offer · call") : k === "placas" ? E2("Llama o pasa", "Call or stop by") : vMin != null ? `${E2("Desde", "From")} ${usd(vMin)}` : E2("Llama", "Call");
  const llamarC: Cta = ap.negocio.telefono ? { l: E2("Llamar", "Call"), icon: "phone", go: acc.llamar } : { l: E2("Escribir", "Message"), icon: "bubble", go: acc.escribir };
  const cta: Cta = !pro ? llamarC : vende ? { l: E2("Prueba de manejo", "Test drive"), icon: "car", go: acc.irTab } : k === "mayor" ? { l: E2("Ver la subasta", "See the auction"), icon: "car", go: acc.irTab }
    : k === "cash" ? { l: E2("Pedir oferta", "Get an offer"), icon: "calendar", go: acc.irTab } : k === "fin" ? { l: E2("Pedir precalificación", "Get pre-qualified"), icon: "calendar", go: acc.irTab } : { l: E2("Pedir cita", "Book"), icon: "calendar", go: acc.irTab };
  const sub = vende ? [k === "bhph" ? E2("SIN CRÉDITO", "NO CREDIT") : ap.itin ? E2("CON ITIN", "WITH ITIN") : "", E2(`${ap.lot} EN EL LOTE`, `${ap.lot} ON THE LOT`)].filter(Boolean).join(" · ") : "";
  return { ap, es, E2, nm, pro, secs, notes: notes.slice(0, 4), desde, linea, tabL, top, top2, hoja, cta, llamarC, acc, sub, td: ap.td ?? [],
    abrir: (id: string, ev?: MouseEvent) => { stop(ev); if (pro) setHoja(id); else if (pide) acc.pedir(pedirHref(id)); }, cerrar: () => setHoja(null),
    primeros: [...ap.carros.map(itemC), ...ap.servicios.map(itemS)].slice(0, pro ? 4 : 5), itemC, itemS, pide, pedirHref };
}
export type DlV = NonNullable<ReturnType<typeof useDealer>>;

export function DlTab({ v, desk }: { v: DlV; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · autos · desktop" : "Ficha · autos"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <Top top={v.top} top2={v.top2} label="autos" />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <Lista secs={v.secs} desk={desk} can={v.pro || v.pide} abrir={v.abrir} vacio={v.E2("Ahora no tiene carros a la vista en To’Latino: pregunta en el lote.", "No cars listed on To’Latino right now: ask at the lot.")} />
    </div>
  );
}

/* La hoja de un carro (L151–152): fotos, el desglose EN LA PUERTA, millaje, título, historial, garantía, lo que debes saber (el salvage
   primero) y el pago de ejemplo con enganche, tasa y meses (o el total pagado de compre aquí pague aquí). La de un servicio, su texto. */
export function DlHoja({ v }: { v: DlV }) {
  const { ap, E2, nm, es } = v;
  if (!v.hoja) return null;
  const x = ap.carros.find((c) => c.id === v.hoja), s = x ? null : ap.servicios.find((c) => c.id === v.hoja);
  if (!x && !s) return null;
  const cta: Cta = v.pide ? { l: x ? E2("Prueba de manejo", "Test drive") : v.itemS(s!).btn, icon: x ? "car" : "calendar", go: () => { v.cerrar(); v.acc.pedir(v.pedirHref((x ?? s)!.id)); } }
    : { l: v.llamarC.l, icon: v.llamarC.icon, go: () => { v.cerrar(); v.llamarC.go(); } };
  if (s) {
    const it = v.itemS(s);
    return (
      <Hoja label="Servicio · autos" titulo={it.name} fotos={[s.foto ?? ap.negocio.foto].filter((u): u is string => !!u)} price={it.price} meta={it.meta} desc={it.desc} cerrar={v.cerrar} cerrarL={E2("Cerrar", "Close")}
        pieK={s.cents ? E2("PRECIO TOTAL", "TOTAL PRICE") : E2("COSTO", "COST")} pieV={it.price} cta={cta}>
        <Nota ic="check" t={`${s.cents ? E2("El precio es el total; lo que va aparte se dice antes. ", "The price is the total; anything extra is stated first. ") : E2("Es gratis y no te compromete. ", "It is free and commits you to nothing. ")}${v.pide ? E2("Pides el día y la hora aquí; te confirman.", "Request the day and time here; they confirm.") : E2("Se pide llamando o escribiendo al lugar.", "Request it by calling or messaging the place.")}`} />
      </Hoja>
    );
  }
  const c = x!, it = v.itemC(c), p = c.puerta, notas = notasCarro(c, es);
  const pct = es ? pctBp(p.taxBp) : pctBp(p.taxBp).replace(" %", "%");
  const filas: [string, string, boolean][] = [[E2("Precio", "Price"), usd(p.price), false], [E2(`Impuesto ${pct}`, `Tax ${pct}`), usd(p.tax), false], [E2("Placas y título", "Tags and title"), usd(p.tags), false],
    [E2("Cargo del dealer", "Dealer fee"), usd(p.fee), false], [E2("En la puerta", "Out the door"), usd(p.otd), true]];
  const datos: Td[] = [{ k: E2("AÑO", "YEAR"), v: String(c.year) },
    ...(c.miles != null ? [{ k: E2("MILLAS", "MILES"), v: c.miles.toLocaleString("en-US") }] : c.hours != null ? [{ k: E2("HORAS DE MOTOR", "ENGINE HOURS"), v: c.hours.toLocaleString("en-US") }] : []),
    { k: E2("TÍTULO", "TITLE"), v: TITULO[c.title][es ? 0 : 1] },
    ...(c.trans ? [{ k: E2("TRANSMISIÓN", "TRANSMISSION"), v: (TRANS.find((t) => t[0] === c.trans) ?? TRANS[0]!)[es ? 1 : 2] }] : []),
    ...(c.fuel ? [{ k: E2("COMBUSTIBLE", "FUEL"), v: (FUEL.find((t) => t[0] === c.fuel) ?? FUEL[0]!)[es ? 1 : 2] }] : []),
    ...(c.drive ? [{ k: E2("TRACCIÓN", "DRIVE"), v: (DRIVE.find((t) => t[0] === c.drive) ?? DRIVE[0]!)[es ? 1 : 2] }] : []),
    { k: E2("HISTORIAL", "HISTORY"), v: c.history ? (c.historySrc ?? E2("Sí", "Yes")) : E2("No lo trae", "Not included") },
    { k: E2("INSPECCIÓN DE PA", "PA INSPECTION"), v: c.inspeccion ? E2("Sí", "Yes") : "No" },
    ...(c.vin ? [{ k: "VIN", v: c.vin }] : [])];
  const pago = pagoTexto(c.est, es), bh = bhphTexto(c.bhph, es);
  return (
    <Hoja label="Carro · hoja" titulo={it.name} fotos={c.fotos.length ? c.fotos : [ap.negocio.foto].filter((u): u is string => !!u)} price={it.price} meta={it.meta} desc={it.desc} cerrar={v.cerrar} cerrarL={E2("Cerrar", "Close")}
      pieK={E2("EN LA PUERTA", "OUT THE DOOR")} pieV={usd(p.otd)} cta={cta}>
      <Caja k={E2("EN LA PUERTA", "OUT THE DOOR")} label="Carro · en la puerta">
        {filas.map(([a, b, t]) => (
          <div key={a} className={`flex items-baseline justify-between gap-3 py-1.5 ${t ? "mt-1 border-t border-ink/[.08] pt-2.5" : ""}`}>
            <span className={t ? "text-[14px] font-extrabold" : "text-[13px] font-semibold text-ink/70"}>{a}</span>
            <span className={t ? "font-display text-[17px] font-extrabold tracking-[-0.02em]" : "text-[13px] font-bold"}>{b}</span>
          </div>))}
        <div className="mt-1.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{E2("Antes de firmar; nada se agrega después.", "Before you sign; nothing is added later.")}</div>
      </Caja>
      <Datos L={datos} />
      <Caja k={E2("LO QUE DEBES SABER", "GOOD TO KNOW")} label="Carro · lo que debes saber">{notas.map((n) => <Renglon key={n} t={n} />)}</Caja>
      {/* 9m · Retiros del fabricante (L524), con los datos públicos de NHTSA por marca, modelo y año; si ESTE carro ya se arregló, lo confirma el VIN. */}
      {ap.retirosCargados || (c.retiros?.length ?? 0) > 0 ? (
        <Caja k={E2(`RETIROS DEL FABRICANTE · ${c.retiros?.length ?? 0}`, `MANUFACTURER RECALLS · ${c.retiros?.length ?? 0}`)} label="Carro · retiros del fabricante">
          {(c.retiros ?? []).slice(0, 4).map((x) => (
            <div key={x.campana} data-retiro={x.campana} className="mt-2 border-t border-ink/[.07] pt-2 first:mt-1 first:border-0 first:pt-0">
              <div className="text-[13px] font-bold">{x.noManejar ? E2("NO LO MANEJES · ", "DO NOT DRIVE · ") : ""}{x.componente ?? E2("Retiro", "Recall")}</div>
              {x.resumen ? <div className="mt-1 text-pretty text-[12px] font-medium leading-[1.5] text-ink/65">{x.resumen}</div> : null}
              <div className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/45">{`NHTSA ${x.campana}${x.fecha ? ` · ${x.fecha}` : ""}`}</div>
            </div>))}
          <div className="mt-2 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{(c.retiros?.length ?? 0) > 0
            ? E2(`Son los retiros de este modelo y año. Si ESTE carro ya se arregló lo confirma su VIN${c.vin ? ` (${c.vin})` : ""}: pídele el comprobante al dealer o búscalo en nhtsa.gov/recalls. Arreglarlo es gratis en el concesionario de la marca.`, `These are the recalls for this model and year. Whether THIS car was fixed is confirmed by its VIN${c.vin ? ` (${c.vin})` : ""}: ask the dealer for proof or look it up at nhtsa.gov/recalls. The repair is free at the brand's dealership.`)
            : E2("NHTSA no tiene retiros para este modelo y año.", "NHTSA has no recalls for this model and year.")}</div>
        </Caja>) : null}
      {pago && (
        <Caja k={E2("PAGO DE EJEMPLO", "EXAMPLE PAYMENT")} label="Carro · pago de ejemplo">
          <div className="mt-1.5 text-pretty text-[13.5px] font-bold leading-[1.45]">{pago}</div>
          <div className="mt-1.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{totalPagoTexto(c.est!, es)}. {bi(SIN_GARANTIA, es)}</div>
        </Caja>)}
      {bh && (
        <Caja k={E2("SIN CRÉDITO", "NO CREDIT")} label="Carro · compre aquí pague aquí">
          <div className="mt-1.5 text-pretty text-[13.5px] font-bold leading-[1.45]">{bh}</div>
          <div className="mt-1.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{bi(SIN_GARANTIA, es)}</div>
        </Caja>)}
      <Nota ic="car" t={E2("La prueba de manejo es gratis y no te compromete. Pides el día y la hora aquí; te confirman.", "The test drive is free and commits you to nothing. Request the day and time here; they confirm.")} />
    </Hoja>
  );
}
export function DlResumen({ v, desk, onAll }: { v: DlV; desk: boolean; onAll?: () => void }) {
  return <Resumen titulo={v.tabL} primeros={v.primeros} desk={desk} can={v.pro || v.pide} abrir={v.abrir} onAll={onAll} verTodo={v.E2("Ver todo", "See all")}
    top={v.pro ? <Top top={v.top} top2={v.top2} label="autos" /> : undefined}
    pie={!v.pro ? <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{v.E2("Pide la prueba de manejo o la cita aquí, o llama al lugar.", "Request the test drive or booking here, or call the place.")}</div> : undefined} />;
}
export function DlRiel({ v }: { v: DlV }) {
  return <Riel desde={v.desde} td={v.pro ? v.td : []} linea={v.linea} cta={v.cta} label="autos" />;
}
export function DlBarra({ v }: { v: DlV }) {
  if (v.hoja) return null;
  return <Barra desde={v.desde} sub={v.sub} cta={v.cta} label="autos" />;
}
