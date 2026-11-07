"use client";
/* Ficha de Educación, Niños y Deporte (4ed · prototipo neg-edu-listing.js priceFor L60–65, metaOf L94–99, listingAdd (ax.veh L79, notas
   L72–78, TD L81), la hoja L90–95; neg-ninos-kind.js post y tabL L104; neg-deporte-kind.js post, conL L30 y tabL L151). Líneas fijas
   (nunca se suavizan): Educación «El precio del curso es el total…», Niños «Toda guardería muestra su licencia del estado…», Deporte
   «La cuota es la que ves…». La tarjeta de arriba responde la pregunta de cada tipo. Inscribirse en la app llega con 4ee: hasta
   entonces la hoja ofrecía llamar o escribir; desde 4ee, con un negocio Pro, la hoja lleva a inscribirse (/n/{id}/inscribirme). Nunca sale aquí el enlace de una clase en línea ni dato de un inscrito. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type MouseEvent } from "react";
import { contratoTexto, LINEA_DEP, usdD } from "@/lib/deporte-comun";
import { fechaCorta, horaInsc, LINEA_EDU, planTexto, usdI, type Bi } from "@/lib/inscripciones-comun";
import type { CursoPub, InscPublica } from "@/lib/inscripciones-publico";
import { edadTexto, LINEA_NINOS } from "@/lib/ninos-comun";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();

type Acc = { llamar: () => void; escribir: () => void; llegar: () => void };
export function useInsc(ip: InscPublica | null, es: boolean, pro: boolean, acc: Acc) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  if (!ip) return null;
  const nm = (b: Bi | null | undefined) => (b ? (es ? b.es : b.en || b.es) : "");
  const R = ip.rubro, ni = ip.ninos, dp = ip.dep;
  const linea = nm(R === "edu" ? LINEA_EDU : R === "ninos" ? LINEA_NINOS : LINEA_DEP);
  // priceFor / metaOf (L60–65, L94–99).
  const precio = (s: CursoPub) => !s.cents ? E2("Gratis si calificas", "Free if you qualify")
    : s.k === "curso" ? usdI(s.cents) : `${usdI(s.cents)}/${s.k === "mes" ? E2("mes", "mo") : s.k === "semana" ? E2("semana", "wk") : s.k === "clase" ? E2("clase", "class") : E2("hora", "hr")}`;
  const proximo = (s: CursoPub) => s.grupos.find((g) => g.libres > 0) ?? null;
  const meta = (s: CursoPub) => {
    const g = proximo(s), L: string[] = [];
    if (s.k === "curso") {
      if (R === "dep") L.push(E2("TEMPORADA", "SEASON"), ...(s.sem ? [E2(`${s.sem} SEMANAS`, `${s.sem} WEEKS`)] : []), s.team ? E2("POR EQUIPO", "PER TEAM") : E2("POR JUGADOR", "PER PLAYER"));
      else L.push(E2("TOTAL", "TOTAL"), ...(s.sem ? [E2(`${s.sem} SEMANAS`, `${s.sem} WEEKS`)] : []), ...(s.horas ? [`${s.horas} H`] : []), ...(s.cert ? [nm(s.cert).toUpperCase()] : []));
      if (s.mat) L.push(R === "dep" ? E2(`DEPÓSITO ${usdI(s.mat)}`, `${usdI(s.mat)} DEPOSIT`) : R === "ninos" ? E2(`INSCRIPCIÓN ${usdI(s.mat)}`, `${usdI(s.mat)} SIGNUP`) : E2(`MATRÍCULA ${usdI(s.mat)}`, `${usdI(s.mat)} REGISTRATION`));
    }
    if (s.g1) L.push(E2("PRIMERA CLASE GRATIS", "FIRST CLASS FREE"));
    if (s.porCancha) L.push(E2("POR LA CANCHA", "PER FIELD"));
    if (s.grupos.length) L.push(g ? E2(`EMPIEZA ${fechaCorta(g.inicio, true).toUpperCase()}`, `STARTS ${fechaCorta(g.inicio, false).toUpperCase()}`) : E2("LLENO · LISTA DE ESPERA", "FULL · WAITLIST"));
    return L.join(" · ");
  };
  const btn = R === "ninos" ? (ni?.cuidado ? E2("Pedir cupo", "Request a spot") : E2("Inscribir", "Enroll")) : R === "dep" ? (dp?.liga ? E2("Inscribirme", "Sign up") : E2("Ver", "See")) : E2("Inscribirme", "Enroll");
  const item = (s: CursoPub) => ({ id: s.id, name: nm(s.name), desc: nm(s.desc), foto: s.foto, price: precio(s), meta: meta(s) });
  const secs = [...ip.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: ip.cursos.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: ip.cursos.filter((s) => !ip.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  // La pestaña por tipo (kind L89; ninos tabL L104; deporte tabL L151).
  const tabL = R === "edu" ? (ip.cursos.every((x) => x.k !== "curso") ? E2("Clases", "Classes") : E2("Cursos", "Courses"))
    : R === "ninos" ? (ni?.cuidado || ip.tipo === "after" || ip.tipo === "camp" ? E2("Programas", "Programs") : ip.tipo === "clase" ? E2("Clases", "Classes") : E2("Servicios", "Services"))
    : dp?.liga ? E2("Liga y canchas", "League & fields") : dp?.memb ? E2("Membresías", "Memberships") : E2("Precios", "Prices");
  // La tarjeta de arriba (ax.veh L79 y los post): la pregunta de cada tipo y su respuesta.
  const cur = ip.cursos.find((x) => x.k === "curso" && x.cert) ?? null, sig = ip.cursos.map((x) => ({ x, g: proximo(x) })).filter((z) => z.g).sort((p, q) => p.g!.inicio.localeCompare(q.g!.inicio))[0] ?? null;
  let top: { k: string; v: string; s: string } | null = null, top2: { k: string; v: string; s: string } | null = null;
  if (R === "edu") {
    top = ip.tipo === "tutor" ? { k: E2("¿PARA QUÉ GRADOS?", "WHICH GRADES?"), v: nm(ip.cursos[0]?.desc) || E2("Pregúntalo al inscribirte", "Ask when you enroll"), s: linea }
      : ip.tipo === "coach" ? { k: E2("¿CÓMO EMPIEZAS?", "HOW DO YOU START?"), v: ip.cursos.some((x) => x.g1) ? E2("Con una primera clase gratis", "With a free first class") : E2("Con una primera sesión", "With a first session"), s: linea }
      : ip.tipo === "arte" ? { k: E2("¿NECESITAS EXPERIENCIA?", "DO YOU NEED EXPERIENCE?"), v: ip.tags.includes("princ") ? E2("No: hay grupos para principiantes", "No: there are beginner groups") : E2("Pregúntalo antes de inscribirte", "Ask before enrolling"), s: linea }
      : { k: E2("¿QUÉ TE LLEVAS AL FINAL?", "WHAT DO YOU WALK AWAY WITH?"), v: cur ? `${cur.oficial ? E2("Certificado oficial", "Official certificate") : E2("Constancia de la escuela", "School certificate")}: ${nm(cur.cert)}` : E2("Lo que aprendes en clase", "What you learn in class"),
        s: E2("El precio es el total del curso; lo que va aparte se dice antes de inscribirte.", "The price is the course total; anything extra is said before you enroll.") };
    if (sig) top2 = { k: E2("PRÓXIMO GRUPO", "NEXT GROUP"), v: `${nm(sig.x.name)} · ${fechaCorta(sig.g!.inicio, es)}`, s: `${nm(sig.g!.label)} · ${E2(`quedan ${sig.g!.libres} cupos`, `${sig.g!.libres} seats left`)}` };
  } else if (R === "ninos" && ni) {
    if (ni.cuidado) {
      top = { k: E2("¿TIENE LICENCIA?", "IS IT LICENSED?"), v: ni.lic.estado === "valid" ? E2("Sí: licencia del estado de PA (DHS)", "Yes: PA state license (DHS)") : ni.lic.estado === "review" ? E2("Licencia en trámite", "License in process") : ni.lic.estado === "expired" ? E2("Licencia vencida", "License expired") : E2("No tiene licencia del estado", "No state license"),
        s: ni.lic.estado === "valid" ? E2("Verificada por To’Latino con el registro público.", "Verified by To’Latino against the public registry.") : linea };
      top2 = { k: E2("¿HAY CUPO?", "ANY OPENINGS?"), v: !ni.recibe ? E2("Llama para pedir cupo", "Call to ask for a spot") : ni.libres ? E2(`Quedan ${ni.libres} cupos`, `${ni.libres} openings left`) : E2("Lista de espera", "Waitlist"),
        s: `${edadTexto(ni.edad, es)}${ni.ccis ? E2(" · acepta CCIS (subsidio)", " · takes CCIS (subsidy)") : ""}` };
    } else {
      top = { k: E2("¿DESDE QUÉ EDAD?", "FROM WHAT AGE?"), v: edadTexto(ni.edad, es), s: E2("Cada lugar dice las edades que atiende y el precio completo.", "Every place says the ages it serves and the full price.") };
      if (ip.tipo === "terapia" && ni.espera) top2 = { k: E2("EVALUACIÓN", "EVALUATION"), v: E2(`En ${ni.espera} ${ni.espera === 1 ? "semana" : "semanas"}`, `Within ${ni.espera} ${ni.espera === 1 ? "week" : "weeks"}`), s: ni.medicaid ? E2("Acepta Medicaid y CHIP", "Takes Medicaid and CHIP") : "" };
      else if (sig) top2 = { k: E2("PRÓXIMO GRUPO", "NEXT GROUP"), v: `${nm(sig.x.name)} · ${fechaCorta(sig.g!.inicio, es)}`, s: nm(sig.g!.label) };
    }
  } else if (R === "dep" && dp) {
    const t = ip.cursos.find((x) => x.k === "curso");
    if (dp.liga) {
      top = { k: E2("¿QUÉ INCLUYE LA CUOTA?", "WHAT DOES THE FEE INCLUDE?"), v: E2("Toda la temporada · sin cargos por partido", "The whole season · no per-game charges"), s: t ? `${usdD(t.cents)} ${t.team ? E2("por equipo", "per team") : E2("por jugador", "per player")}${t.mat ? E2(` · depósito ${usdD(t.mat)}`, ` · ${usdD(t.mat)} deposit`) : ""}` : linea };
      const g = t ? proximo(t) : null;
      top2 = { k: E2("INSCRIPCIÓN", "SIGNUPS"), v: !g ? E2("Liga llena · lista de espera", "League full · waitlist") : dp.hasta && dp.hasta >= ip.hoy ? E2(`Hasta el ${fechaCorta(dp.hasta, true)}`, `Until ${fechaCorta(dp.hasta, false)}`) : E2(`Quedan ${g.libres}`, `${g.libres} left`),
        s: dp.sueltos ? E2("Aceptan jugadores sueltos", "Free agents welcome") : "" };
    } else if (dp.memb) {
      const m = ip.cursos.find((x) => x.k === "mes");
      top = { k: E2("¿HAY CONTRATO?", "IS THERE A CONTRACT?"), v: contratoTexto({ contrato: dp.contrato, salir: dp.salir }, es), s: E2("Lo que cuesta cancelar se dice antes de firmar.", "The cancellation cost is said before you sign.") };
      if (m) top2 = { k: E2("CUOTA", "FEE"), v: `${usdD(m.cents)} ${E2("al mes", "a month")}`, s: dp.inscripcion ? E2(`Inscripción ${usdD(dp.inscripcion)} · una vez`, `Signup ${usdD(dp.inscripcion)} · once`) : E2("Sin cuota de inscripción", "No signup fee") };
    }
  }
  // Notas (máx. 4): la línea fija, cómo se paga y lo de cada tipo.
  const notes: [string, string][] = [["dollar", linea]];
  if (R === "edu" && ip.cursos.some((x) => x.k === "curso" && x.mat)) notes.push(["calendar", E2("La matrícula aparta tu cupo y se descuenta del total. Si el grupo no abre, se devuelve completa.", "The registration fee holds your seat and comes off the total. If the group does not open, it is refunded in full.")]);
  if (R === "ninos") notes.push(["users", E2("La inscripción es una solicitud: te confirman el cupo antes de empezar.", "Enrollment is a request: they confirm your spot before you start.")], ["shield", E2("Solo recogen a los niños las personas autorizadas, con identificación.", "Only authorized people pick up children, with ID.")]);
  if (R === "dep" && dp?.memb) notes.push(["check", dp.contrato ? E2("Hay contrato: lo que cuesta cancelar antes se dice aquí y por escrito antes de firmar.", "There is a contract: the early cancellation cost is said here and in writing before you sign.") : E2("Sin contrato: cancelas cuando quieras, sin penalidad.", "No contract: cancel any time, no penalty.")]);
  if (R === "dep" && dp?.liga) notes.push(["shield", E2("Si la liga no abre, el depósito se devuelve completo.", "If the league does not open, the deposit is refunded in full.")]);
  if (ip.how.linea) notes.push(["wifi", E2("Clases en línea: el enlace llega solo a los inscritos.", "Online classes: only enrolled students get the link.")]);
  if (!pro) notes.unshift(["phone", E2("Aquí no te inscribes por la app: llama o escribe al lugar.", "You do not enroll in the app here: call or message the place.")]);
  // El horario sale de los grupos de verdad (hora de inicio y días), nunca un «Mañana» por defecto; sin grupos, los filtros derivados.
  const horarioReal = () => {
    const gs = ip.cursos.flatMap((x) => x.grupos).filter((g) => g.min != null);
    const fr = new Set<string>();
    for (const g of gs) fr.add(g.min! >= 17 * 60 ? "noche" : g.min! >= 12 * 60 ? "tarde" : "manana");
    const finde = gs.length > 0 && gs.every((g) => g.dows.length > 0 && g.dows.every((d) => d === 0 || d === 6));
    if (!gs.length) { for (const t of ["manana", "tarde", "noche"]) if (ip.tags.includes(t)) fr.add(t); }
    const N: Record<string, string> = { manana: E2("Mañana", "Morning"), tarde: E2("Tarde", "Afternoon"), noche: E2("De noche", "Evenings") };
    const v = ["manana", "tarde", "noche"].filter((x) => fr.has(x)).map((x) => N[x]).join(" · ");
    return finde || (!gs.length && ip.tags.includes("finde")) ? (v ? `${v} · ${E2("fin de semana", "weekends")}` : E2("Fin de semana", "Weekends")) : v || E2("Pregúntalo", "Ask");
  };
  // El riel (TD L81; Niños EDADES; Deporte).
  const td: { k: string; v: string }[] = R === "edu" ? [{ k: E2("CÓMO", "HOW"), v: ip.how.linea ? E2("Presencial o en línea", "In person or online") : E2("Presencial", "In person") },
      { k: E2("HORARIO", "SCHEDULE"), v: horarioReal() },
      { k: E2("PLAN", "PLAN"), v: ip.cursos.some((x) => x.plan) ? E2("Plan de pagos", "Payment plan") : E2("Pago completo", "Pay in full") }]
    : R === "ninos" ? [{ k: E2("EDADES", "AGES"), v: edadTexto(ni?.edad ?? null, es) }, ni?.cuidado ? { k: E2("LICENCIA", "LICENSE"), v: ni.lic.estado === "valid" ? E2("Del estado", "State") : E2("No", "No") } : { k: E2("ESPAÑOL", "SPANISH"), v: ip.how.esp ? E2("Sí", "Yes") : "—" },
      ni?.cuidado ? { k: E2("SUBSIDIO", "SUBSIDY"), v: ni.ccis ? "CCIS" : "No" } : { k: E2("PRIMERA CLASE", "FIRST CLASS"), v: ip.cursos.some((x) => x.g1) ? E2("Gratis", "Free") : "—" }]
    : dp?.liga ? [{ k: E2("CUOTA", "FEE"), v: (() => { const t = ip.cursos.find((x) => x.k === "curso"); return t ? usdD(t.cents) : "—"; })() }, { k: E2("INSCRIPCIÓN HASTA", "SIGNUPS UNTIL"), v: dp.hasta ? fechaCorta(dp.hasta, es) : "—" }, { k: E2("SUELTOS", "FREE AGENTS"), v: dp.sueltos ? E2("Sí", "Yes") : "No" }]
    : [{ k: E2("CUOTA", "FEE"), v: (() => { const m = ip.cursos.find((x) => x.k === "mes"); return m ? usdD(m.cents) : "—"; })() }, { k: E2("CONTRATO", "CONTRACT"), v: dp?.contrato ? E2(`${dp.contrato} meses`, `${dp.contrato} mo`) : E2("No", "No") }, { k: E2("PRIMERA CLASE", "FIRST CLASS"), v: ip.cursos.some((x) => x.g1) ? E2("Gratis", "Free") : "—" }];
  const conPrecio = ip.cursos.filter((x) => x.cents > 0), base = conPrecio.find((x) => x.k === "mes") ?? conPrecio.find((x) => x.k === "semana") ?? conPrecio[0];
  const desde = ni?.cuidado && ni.semana ? E2(`${usdD(ni.semana)} la semana`, `${usdD(ni.semana)} a week`) : base ? `${E2("Desde ", "From ")}${precio(base)}` : ip.cursos.length ? E2("Gratis si calificas", "Free if you qualify") : E2("Pregunta el precio", "Ask for the price");
  const cta = { l: ip.negocio.telefono ? E2("Llamar", "Call") : E2("Escribir", "Message"), icon: ip.negocio.telefono ? "phone" : "bubble", go: ip.negocio.telefono ? acc.llamar : acc.escribir };
  return { ip, es, E2, nm, pro, secs, notes: notes.slice(0, 4), td, desde, linea, tabL, top, top2, hoja, acc, cta, btn,
    abrir: (id: string, ev?: MouseEvent) => { stop(ev); if (pro) setHoja(id); }, cerrar: () => setHoja(null), primeros: ip.cursos.slice(0, pro ? 4 : 5).map(item) };
}
export type In = NonNullable<ReturnType<typeof useInsc>>;

function Top({ v }: { v: In }) {
  if (!v.top) return null;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div data-screen-label="Ficha · inscripciones · lo que importa" className="rounded-[18px] bg-ink px-4 py-4 text-white">
        <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-white/60">{v.top.k}</div>
        <div className="mt-1.5 text-pretty font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em]">{v.top.v}</div>
        {v.top.s && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-white/75">{v.top.s}</div>}
      </div>
      {v.top2 && (
        <div data-screen-label="Ficha · inscripciones · lo segundo" className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-4">
          <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{v.top2.k}</div>
          <div className="mt-1.5 text-pretty font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em]">{v.top2.v}</div>
          {v.top2.s && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{v.top2.s}</div>}
        </div>)}
    </div>
  );
}
function Fila({ v, it, tarjeta, desc }: { v: In; it: In["primeros"][number]; tarjeta?: boolean; desc?: boolean }) {
  const can = v.pro;
  return (
    <div role={can ? "button" : undefined} tabIndex={can ? 0 : undefined} onClick={(e) => (can ? v.abrir(it.id, e) : undefined)} onKeyDown={(e) => { if (can && e.key === "Enter") v.abrir(it.id); }}
      className={`${tarjeta ? "flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex items-center gap-[13px] border-b border-ink/[.07] py-3.5"} ${can ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        {desc && it.desc && <div className="mt-1 line-clamp-3 text-pretty text-[12.5px] leading-[1.5] text-ink/60">{it.desc}</div>}
        {it.meta && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {can && <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, e)}>{v.btn}</Button>}
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-semibold leading-[1.5]">{t}</span></div>
);

export function InTab({ v, desk }: { v: In; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · inscripciones · desktop" : "Ficha · inscripciones"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <Top v={v} />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} desc />)}</div>
          </div>
        ))}
        {!v.secs.length && <div className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-3.5 text-pretty text-[13px] font-semibold leading-[1.5] text-ink/70">{v.E2("Todavía no publica sus precios en To’Latino: pregúntalos al lugar.", "No prices posted on To’Latino yet: ask the place.")}</div>}
      </div>
    </div>
  );
}

/* La hoja (L90–95): precio, te llevas y horas, incluye, va aparte, los grupos con sus cupos y cómo se paga. */
export function InHoja({ v }: { v: In }) {
  const { ip, E2, es, nm } = v;
  if (!v.hoja) return null;
  const s = ip.cursos.find((x) => x.id === v.hoja);
  if (!s) return null;
  const it = v.secs.flatMap((x) => x.items).find((x) => x.id === s.id)!;
  const R = ip.rubro;
  // Cómo se paga (payT L92; deporte L134–137; §6 #1: se retiene al enviar y se cobra al confirmar).
  const pago = s.k === "curso" && s.mat ? E2(`Para apartar el lugar se retienen ${usdI(s.mat)} (${R === "dep" ? "depósito" : R === "ninos" ? "inscripción" : "matrícula"}); se cobran cuando confirman y se descuentan del total. Si no confirman o no abre, se libera completo. ${R === "edu" ? planTexto(s.cents, s.mat, s.plan, true) + ", en la escuela." : "El resto se paga en el lugar."}`,
      `To hold the spot ${usdI(s.mat)} is held (${R === "dep" ? "deposit" : R === "ninos" ? "signup fee" : "registration"}); it is charged when they confirm and comes off the total. If they do not confirm or it does not open, it is released in full. ${R === "edu" ? planTexto(s.cents, s.mat, s.plan, false) + ", at the school." : "The rest is paid at the place."}`)
    : s.k === "curso" ? E2("Se paga en el lugar el primer día.", "Paid at the place on day one.")
    : s.g1 ? E2("La primera clase es gratis, sin tarjeta y sin compromiso: pagas solo si te quedas.", "The first class is free, no card and no commitment: you pay only if you stay.")
    : s.k === "semana" ? E2("Pagas la semana en el lugar.", "You pay the week at the place.") : s.k === "mes" ? E2("Pagas el mes en el lugar. To’Latino no cobra la mensualidad.", "You pay the month at the place. To’Latino does not charge the monthly fee.") : E2("Se paga en el lugar.", "Paid at the place.");
  const router = useRouter();
  // 4ee: con un negocio Pro (booking) la hoja lleva a inscribirse; si no, a llamar o escribir.
  const go = () => { v.cerrar(); if (ip.booking) router.push(`/n/${ip.negocio.id}/inscribirme?svc=${s.id}`); else v.cta.go(); };
  const ctaL = ip.booking ? (s.grupos.length && !s.grupos.some((g) => g.libres > 0) ? E2("Lista de espera", "Waitlist") : v.btn === "Ver" || v.btn === "See" ? E2("Inscribirme", "Sign up") : v.btn) : v.cta.l;
  return (
    <div data-screen-label="Servicio · inscripción" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[170px] flex-none bg-photo-bg" style={fondo(s.foto ?? ip.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{it.meta}</span></div>
              {it.desc && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{it.desc}</p>}
            </div>
            {(s.cert || s.horas) && R === "edu" && (
              <div className="rounded-2xl bg-paper px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("TE LLEVAS", "YOU WALK AWAY WITH")}</div>
                <div className="mt-1 text-[14px] font-bold">{s.cert ? `${s.oficial ? E2("Certificado oficial", "Official certificate") : E2("Constancia de la escuela", "School certificate")}: ${nm(s.cert)}` : E2("Lo que aprendes en clase", "What you learn in class")}</div>
                <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/50">{[s.horas ? `${s.horas} ${E2("HORAS", "HOURS")}` : "", s.certBy ? `${E2("LO DA", "ISSUED BY")} ${nm(s.certBy).toUpperCase()}` : ""].filter(Boolean).join(" · ")}</div>
              </div>)}
            {s.inc.length > 0 && (
              <div className="rounded-2xl border border-ink/[.08] px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("INCLUYE", "INCLUDES")}</div>
                {s.inc.map((z) => <div key={z.es} className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-[1.45]"><span className="grid flex-none pt-0.5"><Icon name="check" size={14} color="var(--tl-open-text)" /></span>{nm(z)}</div>)}
              </div>)}
            {s.no.length > 0 && (
              <div className="rounded-2xl border border-ink/[.08] px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("VA APARTE", "EXTRA")}</div>
                {s.no.map((z) => <div key={z.es} className="mt-2 text-pretty text-[13px] font-semibold leading-[1.45]">{nm(z)}</div>)}
              </div>)}
            {s.grupos.length > 0 && (
              <div data-screen-label="Servicio · grupos" className="rounded-2xl border border-ink/[.08] px-4 py-1">
                {s.grupos.map((g, i) => (
                  <div key={g.id} className={`flex items-center justify-between gap-3 py-3 ${i ? "border-t border-ink/[.06]" : ""}`}>
                    <div className="min-w-0"><div className="text-[13.5px] font-bold">{nm(g.label)}</div><div className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/50">{`${E2("EMPIEZA", "STARTS")} ${fechaCorta(g.inicio, es).toUpperCase()}${g.min != null && !nm(g.label).includes(horaInsc(g.min)) ? ` · ${horaInsc(g.min)}` : ""}`}</div></div>
                    <div className="flex-none font-mono text-[10px] font-bold tracking-[0.08em]" style={{ color: g.libres ? "var(--tl-open-text)" : "rgba(11,14,18,.45)" }}>{g.libres ? E2(`${g.libres} CUPOS`, `${g.libres} SEATS`) : E2("LLENO", "FULL")}</div>
                  </div>))}
              </div>)}
            <Nota ic="dollar" t={pago} />
            {!ip.booking && <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Para inscribirte, llama o escribe al lugar: te dicen si hay cupo y te lo apartan.", "To enroll, call or message the place: they tell you if there is room and hold it for you.")}</div>}
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("PRECIO", "PRICE")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.03em]">{it.price}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={ip.booking ? "calendar" : v.cta.icon} onClick={go}>{ctaL}</Button></div>
        </div>
      </div>
    </div>
  );
}

export function InResumen({ v, desk, onAll }: { v: In; desk: boolean; onAll?: () => void }) {
  return (
    <div>
      {v.pro && <div data-screen-label="Resumen · inscripciones" className="mb-4"><Top v={v} /></div>}
      {v.primeros.length > 0 && <>
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{v.tabL}</div>
          {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{v.E2("Ver todo", "See all")}</button>}
        </div>
        <div data-screen-label={desk ? "Resumen desktop · inscripciones" : "Resumen · lista"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
          {v.primeros.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
        </div></>}
      {!v.pro && <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{v.E2("Aquí no te inscribes por la app: llama o escribe al lugar.", "You do not enroll in the app here: call or message the place.")}</div>}
    </div>
  );
}
export function InRiel({ v }: { v: In }) {
  return (
    <div data-screen-label="Ficha · inscripciones · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      {v.pro && <div className="grid grid-cols-3 gap-2">
        {v.td.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.25]">{m.v}</div></div>)}
      </div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.linea}</div>
      <div className="flex"><Button icon={v.cta.icon} block onClick={v.cta.go}>{v.cta.l}</Button></div>
    </div>
  );
}
export function InBarra({ v }: { v: In }) {
  if (v.hoja) return null;
  const sub = v.pro && v.td.length > 1 ? `${v.td[1]!.k} · ${v.td[1]!.v}` : "";
  return (
    <div data-screen-label="Ficha · barra de inscripciones" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde}</div>
        {sub && <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</div>}
      </div>
      <Button icon={v.cta.icon} onClick={v.cta.go}>{v.cta.l}</Button>
    </div>
  );
}
