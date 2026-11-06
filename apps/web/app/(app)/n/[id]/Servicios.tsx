"use client";
/* Servicios en la ficha de Belleza (prototipo neg-bell-book.js · listingAdd y sheetVals): «Ficha · servicios» (por
   servicio / por barbero, notas), «Servicio · opciones» (la hoja: opciones, extras, ¿con quién?, depósito), «Resumen ·
   servicios», «Ficha · Booking · columna» y la barra. Compuesto con el sistema de diseño (Button, Tag, Icon,
   OptionGroup, AddOnRow, StaffPicker, DepositNote, ReservationCard). El precio que se ve aquí es una vista: el servidor
   lo vuelve a calcular al enviar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type MouseEvent } from "react";
import type { CitasPublica, PersonaPub, ServicioPub } from "@/lib/citas";
import { proximasHoras } from "./acciones-cita";

type N = "Icon" | "Button" | "Tag" | "OptionGroup" | "AddOnRow" | "StaffPicker" | "DepositNote" | "ReservationCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag, OptionGroup, AddOnRow, StaffPicker, DepositNote, ReservationCard } = UI as unknown as Record<N, ComponentType<any>>;

export const dinero = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
export const durL = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
export const horaL = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DS = { es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
export function diaS(hoy: string, i: number, es: boolean) {
  if (i === 0) return es ? "Hoy" : "Today";
  if (i === 1) return es ? "Mañana" : "Tomorrow";
  const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
  return `${DS[es ? "es" : "en"][d.getUTCDay()]} ${d.getUTCDate()}`;
}
export const aprL = (p: Pick<PersonaPub, "auto" | "resp">, es: boolean) => (p.auto ? (es ? "CONFIRMA AL INSTANTE" : "CONFIRMS INSTANTLY") : `${es ? "RESPONDE EN ~" : "REPLIES IN ~"}${p.resp >= 60 ? `${Math.round(p.resp / 60)} H` : `${p.resp} MIN`}`);
export const aprC = (p: Pick<PersonaPub, "auto">) => (p.auto ? "bg-signal/[.18] text-open-text" : "bg-pro/20 text-pro-ink");
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();

type Hoja = { svc: string; opts: Record<string, number>; adds: string[]; con: string | null };
/* Precio y tiempo de lo elegido con una persona (la vista; el servidor recalcula). */
export function precio(s: ServicioPub, extras: ServicioPub[], h: Pick<Hoja, "opts" | "adds">, persona: string | null) {
  const base = persona ? s.hacen.find((x) => x.id === persona)?.cents : null;
  let cents = base ?? s.cents, dur = s.dur;
  s.opts.forEach((g, gi) => { const o = g.o[h.opts[String(gi)] ?? -1]; if (o) { cents += o.p; dur += o.m; } });
  for (const id of h.adds) { const a = extras.find((z) => z.id === id); if (a) { cents += persona ? a.hacen.find((x) => x.id === persona)?.cents ?? a.cents : a.cents; dur += a.dur; } }
  return { cents: Math.max(0, cents), dur: Math.max(5, dur), ok: base != null || !persona };
}
export function citaUrl(negocio: string, h: Hoja) {
  const q = new URLSearchParams({ s: h.svc });
  const o = Object.entries(h.opts).map(([g, k]) => `${g}-${k}`).join(","); if (o) q.set("o", o);
  if (h.adds.length) q.set("a", h.adds.join(","));
  q.set("con", h.con ?? "any");
  return `/n/${negocio}/cita?${q.toString()}`;
}

export function useSvc(cp: CitasPublica | null, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [modo, setModo] = useState<"svc" | "pro">("svc");
  const [fijo, setFijo] = useState<string | null>(null); // «Por barbero › Booking»: los servicios de esa persona, con sus precios
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [prox, setProx] = useState<Record<string, { i: number; m: number } | null>>({});
  useEffect(() => { if (!cp) return; let vivo = true; void proximasHoras(cp.negocio.id, 40).then((x) => { if (vivo) setProx(x); }); return () => { vivo = false; }; }, [cp]);
  const g = useMemo(() => new Map((cp?.gente ?? []).map((p) => [p.id, p])), [cp]);
  if (!cp) return null;
  const silla = cp.model === "chair", w = { uno: es ? cp.w.uno.es : cp.w.uno.en, varios: es ? cp.w.varios.es : cp.w.varios.en, silla: es ? cp.w.silla.es : cp.w.silla.en };
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const prx = (id: string) => prox[id] ?? null;
  const nxL = (n: { i: number; m: number } | null) => (n ? `${diaS(cp.hoy, n.i, es)} ${horaL(n.m)}` : "");
  const depNeg = Math.max(0, ...cp.gente.map((p) => p.dep));
  const abrir = (svc: string, e?: MouseEvent) => { stop(e); if (!cp.can) return; setHoja({ svc, opts: {}, adds: [], con: fijo ?? (silla ? null : "any") }); };

  // ── La lista por servicio ──
  const persona = fijo ? g.get(fijo) ?? null : null;
  const lista = cp.servicios.filter((s) => !persona || s.hacen.some((h) => h.id === persona.id));
  const item = (s: ServicioPub) => {
    const meta = [durL(s.dur).toUpperCase()];
    let p: string;
    if (persona) p = dinero(s.hacen.find((h) => h.id === persona.id)!.cents);
    else if (silla) {
      const ps = s.hacen.map((h) => h.cents), lo = Math.min(...ps), hi = Math.max(...ps);
      p = lo === hi ? dinero(lo) : `${dinero(lo)}–${dinero(hi)}`;
      meta.push(`${ps.length} ${ps.length === 1 ? w.uno : w.varios}`.toUpperCase());
    } else {
      p = `${s.desde || s.opts.some((gr) => gr.o.some((o) => o.p > 0)) ? E2("Desde ", "From ") : ""}${dinero(s.cents)}`;
      if (depNeg) meta.push(`${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(depNeg)}`);
    }
    return { id: s.id, name: nm(s.name), foto: s.foto, meta: meta.join(" · "), price: p };
  };
  const secs = [...cp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: lista.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: lista.filter((s) => !cp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);

  // ── Notas ──
  const notes: [string, string][] = [];
  if (persona) notes.push(["users", E2(`Servicios de ${persona.corto}, con sus precios. Tocas uno para ver su agenda.`, `${persona.corto}'s services, with their prices. Tap one to see their schedule.`)]);
  else if (silla) notes.push(["users", E2(`Cada ${w.uno} renta su ${w.silla.toLowerCase()} y pone su precio. Aquí ves el rango; el precio exacto, al elegir con quién.`, `Each ${w.uno} rents their ${w.silla.toLowerCase()} and sets their price. Here you see the range; the exact price when you choose who.`)]);
  if (!cp.can) notes.push(["clock", cp.off === "apagado" ? E2("Sin cita: llegas y esperas turno.", "Walk-in only: come in and wait your turn.") : cp.off === "tope" ? E2("Llama para pedir tu hora o pasa por el local.", "Call for a time or stop by.") : E2("Por ahora no toma citas en línea: llama o pasa por el local.", "Not taking online bookings right now: call or stop by.")]);
  else if (!silla && depNeg) notes.push(["lock", E2(`Depósito de ${dinero(depNeg)}: se cobra al enviar y se descuenta del total. Si no se confirma, te lo devolvemos.`, `${dinero(depNeg)} deposit: charged when you send, taken off the total. Refunded if not confirmed.`)]);
  else if (persona && persona.dep) notes.push(["lock", E2(`Depósito de ${dinero(persona.dep)}: se cobra al ${persona.auto ? "confirmar" : "enviar"} y se descuenta del total. Si no se confirma, te lo devolvemos.`, `${dinero(persona.dep)} deposit: charged when you ${persona.auto ? "confirm" : "send"}, taken off the total. Refunded if not confirmed.`)]);

  // ── Por barbero ──
  const pros = cp.gente.map((p) => {
    const mios = cp.servicios.filter((s) => s.hacen.some((h) => h.id === p.id)), mn = Math.min(...mios.map((s) => s.hacen.find((h) => h.id === p.id)!.cents)), nx = prx(p.id);
    return { p, seat: p.silla ? `${w.silla} ${p.silla}`.toUpperCase() : "", meta: mios.length ? `${E2("DESDE ", "FROM ")}${dinero(mn)}` : "", next: nx ? `${E2("Próxima hora: ", "Next opening: ")}${nxL(nx).toLowerCase()}` : prox[p.id] === null ? E2("Sin horas en 14 días", "No openings in 14 days") : "", hoy: nx?.i === 0 };
  });

  // ── Mi cita ──
  const mia = cp.mia ? {
    k: E2("TU CITA", "YOUR BOOKING"), tag: cp.mia.st === "pend" ? E2("PENDIENTE", "PENDING") : cp.mia.st === "alt" ? E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE") : E2("CONFIRMADA", "CONFIRMED"),
    tone: cp.mia.st === "ok" ? "signal" : cp.mia.st === "alt" ? "action" : "neutral",
    t: `${cp.mia.svc} · ${diaS(cp.hoy, cp.mia.i, es)} · ${horaL(cp.mia.m)}`,
    s: cp.mia.st === "pend" ? E2(`${cp.mia.con} responde en ~${cp.mia.resp} min`, `${cp.mia.con} replies in ~${cp.mia.resp} min`) : cp.mia.st === "alt" ? E2("Te proponen otra hora", "They suggest another time") : E2(`Con ${cp.mia.con}`, `With ${cp.mia.con}`),
    onClick: () => router.push(`/cita/${cp.mia!.numero}`),
  } : null;

  // ── Resumen, columna y barra ──
  const todos = cp.servicios.flatMap((s) => s.hacen.map((h) => h.cents));
  const desde = todos.length ? Math.min(...todos) : 0;
  const prxs = cp.gente.map((p) => prx(p.id)).filter(Boolean) as { i: number; m: number }[];
  const primera = prxs.sort((a, b) => a.i - b.i || a.m - b.m)[0] ?? null;
  const algunoAuto = cp.gente.some((p) => p.auto), todosAuto = cp.gente.length > 0 && cp.gente.every((p) => p.auto);
  const deps = [...new Set(cp.gente.map((p) => p.dep))];
  const riel = [
    { k: E2("PRÓXIMA HORA", "NEXT OPENING"), v: primera ? nxL(primera) : "—" },
    { k: E2("RESPONDE", "REPLIES"), v: todosAuto ? E2("Al instante", "Instantly") : algunoAuto && silla ? E2("Según la silla", "Per chair") : `~${Math.min(...cp.gente.map((p) => p.resp)) >= 60 ? `${Math.round(Math.min(...cp.gente.map((p) => p.resp)) / 60)} h` : `${Math.min(...cp.gente.map((p) => p.resp))} min`}` },
    { k: E2("DEPÓSITO", "DEPOSIT"), v: deps.length === 1 ? (deps[0] ? dinero(deps[0]) : E2("No pide", "None")) : `${E2("Hasta ", "Up to ")}${dinero(Math.max(...deps))}` },
  ];
  const nota = !cp.can ? notes.find((n) => n[0] === "clock")?.[1] ?? "" : todosAuto ? E2("Confirman al instante: si ves la hora libre, es tuya. Si pide depósito, se cobra al confirmar.", "Confirmed instantly: if the time is open, it is yours. Deposits are charged on confirmation.")
    : silla ? E2("Booking es una solicitud: confirma la persona que elijas. Si pide depósito, se cobra al enviar y se devuelve si no confirma.", "Booking is a request: the person you choose confirms. Deposits are charged when you send and refunded if not confirmed.")
      : E2("Booking es una solicitud: el negocio confirma. Si pide depósito, se cobra al enviar y se devuelve si no confirma.", "Booking is a request: the business confirms. Deposits are charged when you send and refunded if not confirmed.");

  return {
    cp, es, E2, w, silla, modo, setModo: (m: "svc" | "pro") => { setModo(m); setFijo(null); }, fijo, persona, quitarFijo: () => setFijo(null),
    porPersona: (id: string) => { setFijo(id); setModo("svc"); window.scrollTo({ top: 0 }); },
    secs, notes, pros, mia, abrir, hoja, setHoja, cerrar: () => setHoja(null), prx, nxL, nm, g,
    top: cp.servicios.slice(0, 4).map(item), desde, riel, nota,
  };
}
export type Svc = NonNullable<ReturnType<typeof useSvc>>;

function Fila({ v, it, tarjeta }: { v: Svc; it: Svc["top"][number]; tarjeta?: boolean }) {
  return (
    <div role="button" tabIndex={v.cp.can ? 0 : -1} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (e.key === "Enter") v.abrir(it.id); }}
      className={tarjeta ? `flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5 ${v.cp.can ? "cursor-pointer" : ""}` : `flex items-center gap-[13px] border-b border-ink/[.07] py-3.5 ${v.cp.can ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {v.cp.can && <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, e)}>Booking</Button>}
    </div>
  );
}

/* La pestaña (teléfono y escritorio comparten el contenido). */
export function SvcTab({ v, desk }: { v: Svc; desk: boolean }) {
  const { E2 } = v;
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      {v.mia && <div className="grid"><ReservationCard label={v.mia.k} tag={v.mia.tag} tone={v.mia.tone} title={v.mia.t} sub={v.mia.s} onClick={v.mia.onClick} /></div>}
      {v.silla && (
        <div className="flex gap-1.5 rounded-[14px] bg-ink/5 p-1">
          {([["svc", E2("Por servicio", "By service"), "scissors"], ["pro", E2(`Por ${v.w.uno}`, `By ${v.w.uno}`), "users"]] as const).map(([k, l, ic]) => {
            const on = v.modo === k;
            return (
              <button key={k} type="button" onClick={() => v.setModo(k)} className={`flex h-[38px] flex-1 items-center justify-center gap-[7px] rounded-[11px] text-[12.5px] font-bold ${on ? "bg-white text-ink shadow-[0_1px_3px_rgba(11,14,18,.12)]" : "text-ink/55"}`}>
                <Icon name={ic} size={15} />{l}
              </button>
            );
          })}
        </div>
      )}
      {v.notes.map(([ic, t]) => (
        <div key={t} className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]">
          <span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span>
          <span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span>
          {ic === "users" && v.fijo && <button type="button" onClick={v.quitarFijo} className="flex-none text-[12px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
        </div>
      ))}
      {v.modo === "svc" ? (
        <div className="flex flex-col gap-[22px]">
          {v.secs.map((sc) => (
            <div key={sc.title}>
              <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
              <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-2.5 ${desk ? "grid-cols-2" : "grid-cols-1"}`}>
          {v.pros.map(({ p, seat, meta, next, hoy }) => (
            <div key={p.id} className="flex flex-col gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5">
              <div className="flex items-center gap-[13px]">
                <span className="grid h-[60px] w-[60px] flex-none place-items-center rounded-[18px] bg-photo-bg font-display text-[20px] font-extrabold text-ink/40" style={fondo(p.foto)}>{p.foto ? null : p.corto.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2"><span className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{p.nombre}</span>{seat && <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/45">{seat}</span>}</div>
                  {meta && <div className="mt-[5px] font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{meta}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-[7px] px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] ${aprC(p)}`}>{aprL(p, v.es)}</span>
                    {next && <span className={`text-[11.5px] font-bold ${hoy ? "text-open-text" : "text-ink/60"}`}>{next}</span>}
                  </div>
                </div>
              </div>
              {v.cp.can && <div className="flex"><Button variant="primary" size="md" icon="calendar" block onClick={() => v.porPersona(p.id)}>Booking</Button></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* La hoja del servicio (teléfono: desde abajo; escritorio: ventana). */
export function SvcHoja({ v }: { v: Svc }) {
  const router = useRouter();
  const { cp, E2, es, hoja: q } = v;
  if (!q) return null;
  const s = cp.servicios.find((x) => x.id === q.svc);
  if (!s) return null;
  const up = (o: Partial<Hoja>) => v.setHoja({ ...q, ...o });
  const cand = cp.gente.filter((p) => s.hacen.some((h) => h.id === p.id));
  const own = v.silla ? q.con : q.con && q.con !== "any" ? q.con : null;
  const P = precio(s, cp.extras, q, own);
  const groups = s.opts.map((g, gi) => {
    const sel = q.opts[String(gi)];
    return { title: v.nm(g.t), done: sel != null, opts: g.o.map((o, k) => ({ label: `${v.nm(o.n)}${o.m ? ` · ${o.m > 0 ? "+" : "−"}${Math.abs(o.m)} min` : ""}`, price: o.p ? `${o.p > 0 ? "+" : "−"}${dinero(Math.abs(o.p))}` : "", selected: sel === k })),
      onToggle: (k: number) => up({ opts: { ...q.opts, [String(gi)]: k } }) };
  });
  const adds = cp.extras.filter((a) => !own || a.hacen.some((h) => h.id === own) || !a.hacen.length).map((a) => ({
    id: a.id, label: `${v.nm(a.name)} · ${a.dur} min`, price: `+${dinero(own ? a.hacen.find((h) => h.id === own)?.cents ?? a.cents : a.cents)}`, checked: q.adds.includes(a.id),
    onToggle: () => up({ adds: q.adds.includes(a.id) ? q.adds.filter((z) => z !== a.id) : [...q.adds, a.id] }),
  }));
  const pros = v.silla ? cand.map((p) => {
    const pp = precio(s, cp.extras, q, p.id), nx = v.prx(p.id);
    return { p, on: q.con === p.id, price: dinero(pp.cents), dep: p.dep ? `${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(p.dep)}` : E2("SIN DEPÓSITO", "NO DEPOSIT"),
      seat: p.silla ? `${v.w.silla} ${p.silla}`.toUpperCase() : "", meta: nx ? `${E2("PRÓX ", "NEXT ")}${v.nxL(nx)}`.toUpperCase() : "" };
  }) : [];
  const people = !v.silla && cp.pol.pick && cand.length > 1 ? cand.map((p) => { const nx = v.prx(p.id); return { id: p.id, name: p.corto, image: p.foto ?? undefined, next: nx ? (nx.i === 0 ? horaL(nx.m) : diaS(cp.hoy, nx.i, es)).toUpperCase() : "", soon: nx?.i === 0 }; }) : [];
  const pend = groups.find((g) => !g.done), needWho = v.silla && !q.con;
  const quien = own ? cp.gente.find((p) => p.id === own) ?? null : !v.silla ? cand[0] ?? null : null;
  const dep = quien?.dep ?? 0;
  const depT = dep ? (quien?.auto ? E2(`Depósito de ${dinero(dep)}: se cobra al confirmar y se descuenta del total.`, `${dinero(dep)} deposit: charged on confirmation and taken off the total.`)
    : E2(`Depósito de ${dinero(dep)}: se cobra al enviar y se descuenta del total. Si ${v.silla ? quien!.corto : cp.negocio.nombre} no confirma, te lo devolvemos.`, `${dinero(dep)} deposit: charged when you send and taken off the total. If ${v.silla ? quien!.corto : cp.negocio.nombre} does not confirm, we refund it.`)) : "";
  const rango = (() => { const ps = cand.map((p) => precio(s, cp.extras, q, p.id).cents); const lo = Math.min(...ps), hi = Math.max(...ps); return lo === hi ? dinero(lo) : `${dinero(lo)}–${dinero(hi)}`; })();
  const total = v.silla && !own ? rango : dinero(P.cents);
  const stfName = !v.silla && q.con && q.con !== "any" ? cp.gente.find((p) => p.id === q.con)?.corto : null;
  const cta = pend ? `${E2("Elige: ", "Choose: ")}${pend.title.toLowerCase()}` : needWho ? E2("Elige con quién", "Choose who") : E2("Elegir día y hora", "Choose day and time");
  const go = () => { if (pend || needWho) return; router.push(citaUrl(cp.negocio.id, { ...q, con: v.silla ? q.con : q.con ?? "any" })); };
  const lbl = { req: E2("OBLIGATORIO", "REQUIRED"), ready: E2("LISTO", "DONE") };
  const meta = `${durL(P.dur)}${v.silla && !own ? E2(` · varía por ${v.w.uno}`, ` · varies by ${v.w.uno}`) : ""}`.toUpperCase();
  const cuerpo = (
    <>
      <div className="relative h-[200px] flex-none bg-photo-bg" style={fondo(s.foto ?? cp.negocio.foto)}>
        <div className="absolute left-1/2 top-2.5 -ml-[19px] h-1 w-[38px] rounded-[9px] bg-white/85 lg:hidden" />
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
      </div>
      <div className="px-5 pb-6 pt-[18px]">
        <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{v.nm(s.name)}</div>
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{total}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{meta}</span></div>
        {v.nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{v.nm(s.desc)}</p>}
        {groups.map((g, gi) => <div key={gi} className="mt-5 grid"><OptionGroup title={g.title} meta={E2("ELIGE 1", "CHOOSE 1")} required done={g.done} reqLabel={lbl.req} doneLabel={lbl.ready} options={g.opts} onToggle={g.onToggle} /></div>)}
        {adds.length > 0 && (
          <div className="mt-5 border-t border-ink/[.08] pt-[18px]">
            <div className="text-[15px] font-bold">Extras</div>
            <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/45">{E2("OPCIONAL · SE SUMAN AL TIEMPO", "OPTIONAL · ADDS TIME")}</div>
            <div className="mt-[11px] flex flex-col gap-2">{adds.map((a) => <div key={a.id} className="grid"><AddOnRow label={a.label} price={a.price} checked={a.checked} onToggle={a.onToggle} /></div>)}</div>
          </div>
        )}
        {(v.silla || people.length > 0) && (
          <div className="mt-5 border-t border-ink/[.08] pt-[18px]">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[15px] font-bold">{E2("¿Con quién?", "With whom?")}</span>
              {needWho && <Tag tone="action">{lbl.req}</Tag>}
              {v.silla && q.con && <span className="flex items-center gap-[5px] font-mono text-[9.5px] font-bold tracking-[0.1em] text-open-text"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.4} />{lbl.ready}</span>}
            </div>
            <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/45">{v.silla ? E2("CADA UNO PONE SU PRECIO Y SU AGENDA", "EACH SETS THEIR OWN PRICE AND SCHEDULE") : stfName ? `${E2("CON ", "WITH ")}${stfName}`.toUpperCase() : E2("CUALQUIERA: TE TOCA QUIEN ESTÉ LIBRE", "ANYONE: WHOEVER IS FREE")}</div>
            {v.silla ? (
              <div className="mt-[11px] flex flex-col gap-2">
                {pros.map((x) => (
                  <button key={x.p.id} type="button" onClick={() => up({ con: x.p.id })} aria-pressed={x.on}
                    className={`flex items-center gap-3 rounded-[15px] text-left ${x.on ? "border-[1.5px] border-ink p-[11.5px]" : "border border-ink/10 p-3"}`}>
                    <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] bg-photo-bg font-display text-[16px] font-extrabold text-ink/40" style={fondo(x.p.foto)}>{x.p.foto ? null : x.p.corto.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-[7px]"><span className="text-[13.5px] font-bold">{x.p.nombre}</span>{x.seat && <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-ink/45">{x.seat}</span>}</div>
                      {x.meta && <div className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{x.meta}</div>}
                      <span className={`mt-[7px] inline-block rounded-md px-[7px] py-[3px] font-mono text-[8.5px] font-bold tracking-[0.1em] ${aprC(x.p)}`}>{aprL(x.p, es)}</span>
                    </div>
                    <div className="flex-none text-right"><div className="font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{x.price}</div><div className="mt-[5px] font-mono text-[8.5px] font-bold tracking-[0.08em] text-ink/45">{x.dep}</div></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid"><StaffPicker people={people} selected={q.con ?? "any"} onSelect={(id: string) => up({ con: id })} anyoneLabel={E2("Cualquiera", "Anyone")} /></div>
            )}
          </div>
        )}
        {depT && <div className="mt-[18px] grid"><DepositNote>{depT}</DepositNote></div>}
      </div>
    </>
  );
  const pie = (
    <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
      <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{durL(P.dur).toUpperCase()}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{total}</div></div>
      <div className="flex min-w-0 flex-1"><Button block disabled={!!pend || needWho} onClick={go}>{cta}</Button></div>
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

/* «Resumen · servicios»: los primeros servicios con su botón. */
export function SvcResumen({ v, desk, onAll }: { v: Svc; desk: boolean; onAll?: () => void }) {
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

/* «Ficha · Booking · columna» (escritorio). */
export function SvcRiel({ v, onCta }: { v: Svc; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      {v.mia && <div className="grid"><ReservationCard label={v.mia.k} tag={v.mia.tag} tone={v.mia.tone} title={v.mia.t} sub={v.mia.s} onClick={v.mia.onClick} /></div>}
      <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.04em]">{E2("Desde ", "From ")}{dinero(v.desde)}</div>
      <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.nota}</div>
      {v.cp.can && <div className="flex"><Button icon="calendar" block onClick={onCta}>Booking</Button></div>}
    </div>
  );
}

/* La barra de abajo en el teléfono (fuera de la hoja). */
export function SvcBarra({ v, onCta }: { v: Svc; onCta: () => void }) {
  const { E2 } = v;
  if (v.hoja || !v.cp.can) return null;
  const dep = v.riel[2]!.v;
  return (
    <div data-screen-label="Ficha · barra de citas" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{E2("Desde ", "From ")}{dinero(v.desde)}</div>
        <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${E2("DEPÓSITO", "DEPOSIT")} ${dep}`.toUpperCase()}</div>
      </div>
      <Button icon="calendar" onClick={onCta}>Booking</Button>
    </div>
  );
}
