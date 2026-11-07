"use client";
/* Ficha de Iglesias y Religión (4id · prototipo neg-fe-kind.js metaOf L98–102, priceL L103, btnOf L104, tabL L105, post L108–159). Línea
   fija (nunca se suaviza): «La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.»; funeraria «El precio es el
   total por escrito antes de firmar…»; tienda «El precio de aquí es el de la caja.». La tarjeta de arriba responde la pregunta de cada
   tipo («¿HAY QUE INSCRIBIRSE?», «¿PIDEN PAPELES?», «¿ME DAN EL PRECIO ANTES?»). Iglesias no cobra nada en la app: el donativo es
   sugerido («si no puedes, no se cobra») y la funeraria da el total por escrito. 4ie: «Pedir fecha» e
   «Inscribirme» llevan a la solicitud por el motor de inscripciones ($0); con Free, la fila va directo. La funeraria «Pedir información» es
   contacto, sin presión. */
import { useState, type MouseEvent } from "react";
import { fechaCorta, usdI, type Bi } from "@/lib/inscripciones-comun";
import { REGLAS_FUN, cortoFe } from "@/lib/fe-comun";
import type { FePublica, SvcFePub } from "@/lib/fe-publico";
import { Barra, Button, Caja, Hoja, Icon, Lista, Nota, Renglon, Resumen, Riel, Top, stop, type Cta, type Item, type TopT } from "./Kit4i";

type Acc = { llamar: () => void; escribir: () => void; llegar: () => void; irTab: () => void; pedir: (href: string) => void };
const lst = (L: string[]) => L.join(" · ");
export function useFe(fp: FePublica | null, es: boolean, pro: boolean, acc: Acc) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  const [contacto, setContacto] = useState(false);
  if (!fp) return null;
  const nm = (b: Bi | null | undefined) => (b ? (es ? b.es : b.en || b.es) : "");
  const k = fp.kind, linea = nm(fp.linea);
  const horasDe = (s: SvcFePub) => fp.horarios.filter((h) => h.label.es === s.name.es).sort((a, b) => a.dow - b.dow || a.min - b.min).map((h) => cortoFe(h.dow, h.min, es));
  // metaOf (L98–102) y priceL (L103).
  const meta = (s: SvcFePub) => {
    if (s.forma === "curso") { const g = s.grupos.find((x) => x.libres > 0); return [s.don ? E2("DONATIVO SUGERIDO · SI NO PUEDES, NO SE COBRA", "SUGGESTED DONATION · NO CHARGE IF YOU CANNOT") : E2("GRATIS", "FREE"), g ? E2(`EMPIEZA ${fechaCorta(g.inicio, true).toUpperCase()}`, `STARTS ${fechaCorta(g.inicio, false).toUpperCase()}`) : nm(s.dur).toUpperCase()].filter(Boolean).join(" · "); }
    if (s.forma === "don") return E2("DONATIVO SUGERIDO · SI NO PUEDES, NO SE COBRA", "SUGGESTED DONATION · NO CHARGE IF YOU CANNOT");
    if (s.forma === "tot") return `${E2("PRECIO TOTAL POR ESCRITO", "WRITTEN TOTAL PRICE")}${fp.plan ? E2(" · HASTA 12 PAGOS", " · UP TO 12 PAYMENTS") : ""}`;
    if (s.dur) return `${nm(s.dur).toUpperCase()}${E2(" · GRATIS", " · FREE")}`;
    return lst(horasDe(s)).toUpperCase();
  };
  const precio = (s: SvcFePub) => (s.cents ? usdI(s.cents) : E2("Gratis", "Free"));
  const btnDe = (s: SvcFePub) => (s.forma === "tot" ? E2("Pedir información", "Ask for info") : s.forma === "curso" ? E2("Inscribirme", "Sign up") : s.forma === "don" || s.dur ? E2("Pedir fecha", "Ask for a date") : k === "consejo" || k === "oracion" ? E2("Pedir cita", "Book") : E2("Ver detalles", "See details"));
  // 4ie · Se pide en la app: «Pedir fecha» (donativo o con cita) e «Inscribirme» (catecismo). Lo demás: llegas a la hora.
  const pide = (s: SvcFePub) => s.forma === "curso" || s.forma === "don" || !!s.dur || k === "consejo" || k === "oracion", pedirHref = (id: string) => `/n/${fp.negocio.id}/inscribirme?svc=${id}`;
  const item = (s: SvcFePub): Item => ({ id: s.id, name: nm(s.name), desc: nm(s.desc), foto: s.foto, price: precio(s), meta: meta(s), btn: pro || pide(s) ? btnDe(s) : "" });
  const secs = [...fp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: fp.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: fp.secciones.length ? E2("OTROS", "OTHER") : E2("SERVICIOS", "SERVICES"), items: fp.servicios.filter((s) => !fp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  // tabL (L105).
  const tabL = fp.sobria ? E2("Servicios", "Services") : k === "misa" ? E2("Misas y sacramentos", "Masses & sacraments") : k === "culto" || k === "grupo" ? E2("Cultos y grupos", "Services & groups")
    : k === "ayuda" ? E2("Ayuda", "Help") : k === "tienda" ? E2("Productos", "Products") : E2("Servicios", "Services");
  // La tarjeta de arriba (L140–142) y la segunda con datos reales (la próxima misa, la repatriación, la despensa de hoy).
  const nx = fp.proximo, nxK = k === "misa" ? E2("PRÓXIMA MISA", "NEXT MASS") : k === "grupo" ? E2("PRÓXIMA REUNIÓN", "NEXT MEETING") : E2("PRÓXIMO SERVICIO", "NEXT SERVICE");
  const nxV = !nx ? "" : nx.dias === 0 ? `${E2("Hoy", "Today")} ${cortoFe(nx.dow, nx.min, es).replace(/^\S+ /, "")}` : nx.dias === 1 ? `${E2("Mañana", "Tomorrow")} ${cortoFe(nx.dow, nx.min, es).replace(/^\S+ /, "")}` : cortoFe(nx.dow, nx.min, es);
  const top: TopT = k === "fun" ? { k: E2("¿ME DAN EL PRECIO ANTES?", "DO I GET THE PRICE FIRST?"), v: E2("Sí, el total por escrito", "Yes, the written total"), s: E2("Antes de firmar; nada se agrega después.", "Before you sign; nothing is added later.") }
    : k === "ayuda" ? { k: E2("¿PIDEN PAPELES?", "DO THEY ASK FOR PAPERS?"), v: fp.sinid ? "No" : E2("Una ID de cualquier país", "Any country ID"), s: E2("La ayuda es gratis y para cualquiera.", "Help is free and for anyone.") }
    : k === "tienda" ? { k: E2("¿EL PRECIO ES EL DE LA CAJA?", "IS IT THE REGISTER PRICE?"), v: E2("Sí", "Yes"), s: linea }
    : k === "consejo" ? { k: E2("¿ES PRIVADO?", "IS IT PRIVATE?"), v: E2("Sí, y es gratis", "Yes, and it is free"), s: E2("No es terapia médica. Si piensas hacerte daño, llama o escribe al 988.", "It is not medical therapy. If you think of hurting yourself, call or text 988.") }
    : { k: E2("¿HAY QUE INSCRIBIRSE?", "DO I NEED TO SIGN UP?"), v: E2("No: llegas al servicio", "No: just come to the service"), s: E2("Nadie te pide nada en la puerta.", "Nobody asks you for anything at the door.") };
  const top2: TopT = k === "fun" ? (fp.repatria ? { k: E2("REPATRIACIÓN", "REPATRIATION"), v: E2(`A RD en ${fp.rep} días`, `To the DR in ${fp.rep} days`), s: E2("Con los papeles del consulado.", "With the consulate paperwork.") } : null)
    : k === "ayuda" ? { k: E2("HOY", "TODAY"), v: fp.agotado ? E2("Se acabó por hoy", "Out for today") : E2("Hay ayuda hoy", "Help available today"), s: "" }
    : nx ? { k: nxK, v: nxV, s: `${nm(nx.label)} · ${({ es: E2("en español", "in Spanish"), en: E2("en inglés", "in English"), bil: E2("español e inglés", "Spanish and English"), otro: E2("otro idioma", "another language") } as Record<string, string>)[nx.lang]}` } : null;
  // Notas (máx. 4; L137–139): la línea fija y lo de cada tipo; los sellos solo de una licencia verificada.
  const notes: [string, string][] = [["dollar", linea]];
  if (k === "misa" || k === "culto") notes.push(["check", E2("Para el servicio no hay que inscribirse ni pagar. Los bautizos y bodas piden fecha.", "No signup or payment for the service. Baptisms and weddings need a date.")]);
  if (k === "fun") notes.push(["check", E2("Lo que va aparte (terreno del cementerio, flores) se dice antes de firmar.", "What is extra (cemetery plot, flowers) is stated before you sign.")]);
  if (fp.sinid) notes.push(["verified", E2("La ayuda no pide papeles ni seguro social.", "Help never asks for papers or SSN.")]);
  for (const s of fp.sellos) notes.push(["verified", `${nm(s.titulo)}${s.numero ? ` · ${s.etiqueta} ${s.numero}` : ""}`]);
  if (!pro) notes.unshift(["phone", E2("Pide la fecha aquí o llama a la oficina.", "Ask for the date here or call the office.")]);
  // fromLabel y CTA (L129–136, L149–151).
  const algoConFecha = fp.servicios.some((s) => s.forma === "don" || s.forma === "curso" || s.dur);
  const desde = pro ? (k === "fun" ? E2("Precio por escrito", "Written price") : k === "ayuda" ? E2("Gratis · ve directo", "Free · walk in") : k === "tienda" ? E2("Precios de la caja", "Register prices")
      : k === "oracion" ? (fp.h24 ? E2("Gratis · a cualquier hora", "Free · any time") : E2("Gratis", "Free")) : E2("Gratis · ven cuando quieras", "Free · come any time"))
    : k === "misa" ? E2("Ve a misa", "Go to mass") : k === "culto" ? E2("Ve al servicio", "Go to the service") : k === "ayuda" ? E2("Ve directo", "Walk in") : k === "fun" ? (fp.h24 ? E2("Llama a cualquier hora", "Call any time") : E2("Llama", "Call")) : k === "grupo" ? E2("Ve a la reunión", "Go to the meeting") : E2("Llama", "Call");
  const llamarC: Cta = fp.negocio.telefono ? { l: E2("Llamar", "Call"), icon: "phone", go: acc.llamar } : { l: E2("Escribir", "Message"), icon: "bubble", go: acc.escribir };
  const cta: Cta = !pro ? (fp.negocio.telefono ? llamarC : { l: E2("Cómo llegar", "Directions"), icon: "pin", go: acc.llegar })
    : k === "fun" ? { l: E2("Pedir información", "Ask for info"), icon: "phone", go: () => setContacto(true) }
    : k === "ayuda" ? { l: E2("Ver la ayuda", "See the help"), icon: "bag", go: acc.irTab }
    : k === "oracion" ? { l: E2("Llamar ahora", "Call now"), icon: "phone", go: llamarC.go }
    : algoConFecha ? { l: E2("Pedir fecha", "Ask for a date"), icon: "calendar", go: acc.irTab } : { l: E2("Ver horarios", "See times"), icon: "calendar", go: acc.irTab };
  const sub = k === "fun" ? (fp.h24 ? E2("ATIENDE LAS 24 HORAS", "OPEN 24 HOURS") : "") : k === "ayuda" ? (fp.agotado ? E2("SE ACABÓ POR HOY", "OUT FOR TODAY") : "") : nx ? `${nxK} · ${nxV}` : fp.h24 ? E2("ATIENDE LAS 24 HORAS", "OPEN 24 HOURS") : "";
  return { fp, es, E2, nm, pro, secs, notes: notes.slice(0, 4), desde, linea, tabL, top, top2, hoja, cta, llamarC, acc, sub, td: fp.td ?? [], contacto, setContacto,
    abrir: (id: string, ev?: MouseEvent) => { stop(ev); if (pro) setHoja(id); else acc.pedir(pedirHref(id)); }, cerrar: () => setHoja(null), primeros: fp.servicios.slice(0, pro ? 4 : 5).map(item), item, pide, pedirHref };
}
export type FeV = NonNullable<ReturnType<typeof useFe>>;

export function FeTab({ v, desk }: { v: FeV; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · iglesia · desktop" : "Ficha · iglesia"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <Top top={v.top} top2={v.top2} label="iglesia" />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <Lista secs={v.secs} desk={desk} can abrir={v.abrir} vacio={v.E2("Todavía no publica sus servicios en To’Latino: pregúntalos a la oficina.", "No services posted on To’Latino yet: ask the office.")} />
    </div>
  );
}
/* La hoja (L145–148): el servicio con su texto; la funeraria lleva a «Pedir información» (contacto). */
export function FeHoja({ v }: { v: FeV }) {
  const { fp, E2, nm, es } = v;
  if (!v.hoja) return null;
  const s = fp.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const it = v.item(s);
  const con = s.forma === "tot" ? `${E2("Te explican cada paso y te dan el total por escrito antes de firmar. ", "They explain each step and give you the written total before you sign. ")}${v.linea}`
    : v.pide(s) ? `${s.don ? E2("El donativo es sugerido: si no puedes, no se cobra. ", "The donation is suggested: if you cannot, there is no charge. ") : E2("Es gratis. ", "It is free. ")}${s.forma === "curso" ? E2("Te inscribes aquí y la oficina te confirma el lugar.", "Sign up here and the office confirms your spot.") : E2("Pides la fecha aquí y la oficina te la confirma.", "Ask for the date here and the office confirms it.")}`
    : `${E2("Es gratis y no hay que inscribirse: llegas a la hora. ", "It is free and there is no signup: just arrive on time. ")}${v.linea}`;
  const cta: Cta = s.forma === "tot" ? { l: E2("Pedir información", "Ask for info"), icon: "phone", go: () => { v.cerrar(); v.setContacto(true); } }
    : v.pide(s) ? { l: it.btn, icon: "calendar", go: () => { v.cerrar(); v.acc.pedir(v.pedirHref(s.id)); } } : { l: E2("Entendido", "Got it"), icon: "check", go: v.cerrar };
  return (
    <Hoja label="Servicio · iglesia" titulo={it.name} fotos={[s.foto ?? fp.negocio.foto].filter((x): x is string => !!x)} price={it.price} meta={it.meta} desc={it.desc} cerrar={v.cerrar} cerrarL={E2("Cerrar", "Close")}
      pieK={s.forma === "tot" ? E2("PRECIO TOTAL", "TOTAL PRICE") : s.don ? E2("DONATIVO SUGERIDO", "SUGGESTED DONATION") : E2("COSTO", "COST")} pieV={it.price} cta={cta}>
      {s.inc.length > 0 && <Caja k={E2("INCLUYE", "INCLUDES")}>{s.inc.map((z) => <Renglon key={z.es} t={nm(z)} ok />)}</Caja>}
      {s.no.length > 0 && <Caja k={E2("VA APARTE", "EXTRA")}>{s.no.map((z) => <Renglon key={z.es} t={nm(z)} />)}</Caja>}
      {s.grupos.length > 0 && (
        <div data-screen-label="Servicio · grupos" className="rounded-2xl border border-ink/[.08] px-4 py-1">
          {s.grupos.map((g, i) => (
            <div key={g.id} className={`flex items-center justify-between gap-3 py-3 ${i ? "border-t border-ink/[.06]" : ""}`}>
              <div className="min-w-0"><div className="text-[13.5px] font-bold">{nm(g.label)}</div><div className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/50">{`${E2("EMPIEZA", "STARTS")} ${fechaCorta(g.inicio, es).toUpperCase()}`}</div></div>
              <div className="flex-none font-mono text-[10px] font-bold tracking-[0.08em]" style={{ color: g.libres ? "var(--tl-open-text)" : "rgba(11,14,18,.45)" }}>{g.libres ? E2(`${g.libres} CUPOS`, `${g.libres} SEATS`) : E2("LLENO", "FULL")}</div>
            </div>))}
        </div>)}
      <Nota ic={s.forma === "tot" ? "dollar" : "check"} t={con} />
    </Hoja>
  );
}
/* «Pedir información» de la funeraria (L110, L132; §6 #7): llamar, WhatsApp o escribir. Sin presión; no se cobra por preguntar. */
export function FeContacto({ v }: { v: FeV }) {
  const { fp, E2, nm } = v;
  if (!v.contacto) return null;
  const tel = fp.negocio.telefono, wa = tel && fp.negocio.whatsapp ? `https://wa.me/${tel.replace(/\D/g, "")}` : null;
  const cerrar = () => v.setContacto(false);
  return (
    <div data-screen-label="Funeraria · pedir información" className="fixed inset-0 z-[60]">
      <div onClick={cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={E2("Pedir información", "Ask for info")} className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-[26px] bg-white px-5 pb-[26px] pt-5 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("Pedir información", "Ask for info")}</div>
          <button type="button" aria-label={E2("Cerrar", "Close")} onClick={cerrar} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        </div>
        <div className="text-pretty text-[13px] font-medium leading-[1.6] text-ink/65">{`${fp.negocio.nombre}. ${E2("Te explican cada paso y te dan el total por escrito antes de firmar.", "They explain each step and give you the written total before you sign.")}`}</div>
        <div className="rounded-2xl bg-paper px-4 py-3">
          <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{nm(REGLAS_FUN[1]![0]).toUpperCase()}</div>
          <div className="mt-1 text-pretty text-[13px] font-semibold leading-[1.5]">{nm(REGLAS_FUN[1]![1])}</div>
        </div>
        <div className="flex flex-col gap-2">
          {tel && <Button icon="phone" block onClick={() => { cerrar(); v.acc.llamar(); }}>{E2("Llamar", "Call")}</Button>}
          {wa && <Button variant="secondary" icon="chat" block onClick={() => window.open(wa, "_blank", "noopener")}>WhatsApp</Button>}
          <Button variant={tel ? "secondary" : "primary"} icon="bubble" block onClick={() => { cerrar(); v.acc.escribir(); }}>{E2("Escribir", "Message")}</Button>
        </div>
      </div>
    </div>
  );
}
export function FeResumen({ v, desk, onAll }: { v: FeV; desk: boolean; onAll?: () => void }) {
  return <Resumen titulo={v.tabL} primeros={v.primeros} desk={desk} can abrir={v.abrir} onAll={onAll} verTodo={v.E2("Ver todo", "See all")}
    top={v.pro ? <Top top={v.top} top2={v.top2} label="iglesia" /> : undefined}
    pie={!v.pro ? <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{v.E2("Pide la fecha aquí o llama a la oficina.", "Ask for the date here or call the office.")}</div> : undefined} />;
}
export function FeRiel({ v }: { v: FeV }) {
  return <Riel desde={v.desde} td={v.pro ? v.td : []} linea={v.linea} cta={v.cta} label="iglesia" />;
}
export function FeBarra({ v }: { v: FeV }) {
  if (v.hoja || v.contacto) return null;
  return <Barra desde={v.desde} sub={v.sub} cta={v.cta} label="iglesia" />;
}
