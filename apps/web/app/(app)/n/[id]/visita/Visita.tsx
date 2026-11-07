"use client";
/* APP-NEG-AUTO-BOOKING y APP-NEG-HOGAR-BOOKING · móvil y desktop (diseño neg-auto-flow.js / neg-hogar-flow.js, vistas
   «ab» del prototipo). Auto: 1 Tu carro (vehículo, luces encendidas, qué le pasa, fotos) → 2 Día y hora → 3 Revisa y envía
   (cómo se cobra, «Guárdame las piezas viejas», depósito). Hogar: 1 Tu casa (¿dónde es?, qué pasa, fotos) → 2 Franja de
   llegada de 2 h + ¿vas a estar en casa? → 3 Revisa y envía (permiso del landlord si alquilas). En el teléfono un paso a la
   vez; en escritorio, todo en una página con la columna de pago. Las horas y el precio los decide el servidor. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { OficiosPublico } from "@/lib/oficios-publico";
import type { HorasVisita } from "@/lib/visitas";
import { subirFoto } from "@/lib/subir-foto";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { HojaCasa, HojaVehiculo, casaMeta, compatCasa, compatVeh, depositoVer, useOficio, vehMeta, vehName } from "../Oficios";
import { horasDeVisita, pedirVisita } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary" | "DepositOutcomes";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots, PaymentSummary, DepositOutcomes } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LIGHTS: [string, string, string][] = [["ce", "Check engine", "Check engine"], ["bat", "Batería", "Battery"], ["temp", "Temperatura", "Temperature"], ["abs", "Frenos o ABS", "Brakes or ABS"], ["oil", "Aceite", "Oil"], ["tpms", "Presión de gomas", "Tire pressure"]];
const AREAS: [string, string, string][] = [["cocina", "Cocina", "Kitchen"], ["bano", "Baño", "Bathroom"], ["sotano", "Sótano", "Basement"], ["cuarto", "Cuarto", "Bedroom"], ["sala", "Sala", "Living room"], ["afuera", "Afuera", "Outside"], ["toda", "Toda la casa", "Whole house"]];

export function Visita({ op, svcId, inicial, es, pago, yo, pre = null }: {
  op: OficiosPublico; svcId: string; inicial: { opts: Record<string, number>; adds: number[]; w: string | null; z: number | null }; es: boolean;
  pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; yo: boolean; pre?: { num: string; lo: number; hi: number; nota: string; mode: string } | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const v = useOficio(op, es, yo)!;
  const s = op.servicios.find((x) => x.id === svcId)!, a = s.a ?? {}, auto = op.rubro === "auto", nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [paso, setPaso] = useState(0), [i, setI] = useState(0), [hSel, setH] = useState<number | null>(null), [H, setHoras] = useState<HorasVisita | null>(null), [cargando, setCargando] = useState(true);
  const [luces, setLuces] = useState<string[]>([]), [area, setArea] = useState<string | null>(null), [nota, setNota] = useState(pre?.nota ?? ""), [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false);
  const [acceso, setAcceso] = useState<"casa" | "llave">("casa"), [accNota, setAccNota] = useState(""), [landlord, setLandlord] = useState(false), [piezas, setPiezas] = useState(false), [sms, setSms] = useState(true);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""), fileRef = useRef<HTMLInputElement>(null);
  const q = useMemo(() => ({ svc: svcId, opts: inicial.opts, adds: inicial.adds, z: inicial.z, w: inicial.w }), [svcId, inicial]);
  const tam = v.veh?.size ?? null;
  useEffect(() => { let vivo = true; setCargando(true); void horasDeVisita(op.negocio.id, q, i, tam).then((x) => { if (!vivo) return; setHoras(x); setCargando(false); if (x && i === 0 && !x.sl.some((h) => h.free) && x.sig) setI(x.sig.i); }); return () => { vivo = false; }; }, [op.negocio.id, q, i, tam]);

  // Precio y tiempo de lo elegido (la vista; el servidor recalcula al enviar).
  const szI = a.sz ? (tam ? (tam === "c" ? 0 : tam === "v" ? 2 : 1) : inicial.z) : null;
  let total = a.sz && szI != null ? a.sz[szI]! : s.cents, dur = s.dur ?? 60;
  const ol = s.opts.map((g, gi) => ({ g, o: g.o[inicial.opts[String(gi)] ?? -1] })).filter((x) => x.o);
  ol.forEach((x) => { total += x.o!.p; dur += x.o!.m; });
  const al = inicial.adds.map((k) => a.x?.[k]).filter(Boolean) as NonNullable<typeof a.x>;
  al.forEach((x) => { total += x.p; dur += x.m; });
  let dep = depositoVer(op, s, total);
  if (!auto && total > 100000) dep = Math.min(dep, Math.floor(total / 3));
  const cp = auto ? compatVeh(op, v.veh, es) : compatCasa(op, v.casa, es), dato = auto ? v.veh : v.casa, ok0 = !!dato && !!cp?.ok;
  const inq = !auto && v.casa?.tenure === "inq", desdeK = ["desde", "cotiza", "pres", "diag", "visita", "hora", "area"].includes(s.k);
  const precioL = s.k === "cotiza" ? E2("Se cotiza", "Quoted") : `${["desde", "pres"].includes(s.k) ? E2("Desde ", "From ") : ""}${s.k === "hora" ? `${dinero(total)}/h` : total ? dinero(total) : E2("Gratis", "Free")}`;
  const ymd = H?.dias[i]?.ymd ?? op.hoy, dowN = new Date(`${ymd}T12:00:00Z`).getUTCDay(), diaL = `${(es ? DL.es : DL.en)[dowN]} ${Number(ymd.slice(8))}`;
  const dias = (H?.dias ?? []).map((d) => ({ id: `d${d.i}`, dow: d.i === 0 ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[d.dow], num: d.num, off: d.off }));
  const slotL = (m: number) => (auto ? horaL(m) : `${hL(m)}–${hL(m + 120)}`);
  const slots = (H?.sl ?? []).map((h) => ({ t: slotL(h.m), taken: !h.free, m: h.m }));
  const hayLibres = slots.some((x) => !x.taken);
  const cuandoL = hSel != null ? auto ? `${cap(diaL)} · ${horaL(hSel)}` : `${cap(diaL)} · ${E2("llega entre ", "arrives between ")}${hL(hSel)} ${E2("y", "and")} ${hL(hSel + 120)}` : auto ? E2("Elige día y hora", "Choose day and time") : E2("Elige la franja", "Choose the window");
  const wL = auto ? (inicial.w ?? a.w) === "deja" ? E2("Lo dejas y te avisan", "You drop it off and they text you") : (inicial.w ?? a.w) === "dom" ? E2("Van donde está tu carro", "They come to your car") : E2("Esperas en el taller", "You wait at the shop") : "";

  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 6) return;
    if (!yo) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`); return; }
    setSubiendo(true); const r = await subirFoto(file); setSubiendo(false);
    if (r.ok && r.id && r.url) setFotos((L) => [...L, { id: r.id!, url: r.url! }]); else setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const necesitaTarjeta = dep > 0;
  const listo = ok0 && hSel != null && (!inq || landlord) && (!necesitaTarjeta || !!tarjeta);
  const falta = !dato ? (auto ? E2("Agrega tu vehículo", "Add your vehicle") : E2("Agrega tu casa", "Add your home")) : !cp?.ok ? cp?.t ?? "" : hSel == null ? (auto ? E2("Elige día y hora", "Choose day and time") : E2("Elige la franja", "Choose the window"))
    : inq && !landlord ? E2("Confirma el permiso de tu landlord", "Confirm your landlord’s permission") : necesitaTarjeta && !tarjeta ? E2("Elige la tarjeta para el depósito", "Choose the card for the deposit") : "";
  const okPaso = paso === 0 ? ok0 : paso === 1 ? hSel != null : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${op.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || hSel == null) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirVisita(op.negocio.id, { ...q, i, m: hSel, nota, sms, pm: necesitaTarjeta ? tarjeta?.pm ?? null : null, clave: clave.current, fotos: fotos.map((f) => f.id), pre: pre?.num ?? null, luces, area, acceso: auto ? null : acceso, accesoNota: accNota, landlord, piezas })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/cita/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = crypto.randomUUID(); }
    if ("hora" in r && r.hora) { setH(null); setPaso(1); void horasDeVisita(op.negocio.id, q, i, tam).then(setHoras); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const T = auto ? [E2("Tu carro", "Your car"), E2("Día y hora", "Day and time"), E2("Revisa y envía", "Review and send")] : [E2("Tu casa", "Your home"), E2("Franja de llegada", "Arrival window"), E2("Revisa y envía", "Review and send")];

  // ── Bloques ──
  const tarjetaSvc = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
        {(ol.length > 0 || al.length > 0) && <div className="mt-[3px] text-[12px] font-medium leading-[1.4] text-ink/60">{[...ol.map((x) => nm(x.o!.n)), ...al.map((x) => nm(x.n))].join(" · ")}</div>}
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${precioL}${dep ? ` · ${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(dep)}` : ""}`.toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const rangoPre = pre ? `${dinero(pre.lo)}–${dinero(pre.hi)}` : "";
  const bloqueDato = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {pre && <div data-screen-label="Booking · con tu pre-estimado" className="flex items-start gap-2.5 rounded-[14px] bg-signal/[.14] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="dollar" size={16} color="var(--tl-open-text)" /></span>
        <span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-open-text">{pre.mode === "pq" ? E2(`Con tu presupuesto ${pre.num}: ${rangoPre}. Tus fotos ya van en la cita.`, `With your quote ${pre.num}: ${rangoPre}. Your photos go with the booking.`)
          : E2(`Con tu pre-estimado ${pre.num}: ${rangoPre}. Tus fotos ya van en la cita.`, `With your pre-estimate ${pre.num}: ${rangoPre}. Your photos go with the booking.`)}</span></div>}
      <button type="button" onClick={() => v.setSheet(auto ? "veh" : "casa")} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name={auto ? "car" : "home"} size={20} color="var(--tl-white)" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{auto ? E2("TU VEHÍCULO", "YOUR VEHICLE") : E2("VA A TU CASA", "COMING TO YOUR HOME")}</span>
          <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{auto ? (v.veh ? vehName(v.veh, es) : E2("Agrega tu vehículo", "Add your vehicle")) : v.casa ? v.casa.dir : E2("Agrega tu casa", "Add your home")}</span>
          {dato && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{auto && v.veh ? vehMeta(v.veh, es) : v.casa ? casaMeta(v.casa, es) : ""}</span>}
          {cp && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: cp.ok ? ("warn" in cp && cp.warn ? "var(--tl-pro-ink)" : "var(--tl-open-text)") : "var(--tl-danger)" }}><Icon name={cp.ok && !("warn" in cp && cp.warn) ? "check" : "warning"} size={13} color="currentColor" />{cp.t}</span>}
        </span>
        <span className="flex-none text-[12.5px] font-bold text-action">{dato ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
      </button>
      {auto && ["diag", "desde", "cotiza"].includes(s.k) && (
        <div><div className={K}>{E2("¿QUÉ LUCES ESTÁN ENCENDIDAS? · OPCIONAL", "WHICH LIGHTS ARE ON? · OPTIONAL")}</div>
          <div className="mt-2 flex flex-wrap gap-2">{LIGHTS.map(([k, l1, l2]) => <Chip key={k} variant={luces.includes(k) ? "selected" : "filter"} onClick={() => setLuces(luces.includes(k) ? luces.filter((z) => z !== k) : [...luces, k])}>{es ? l1 : l2}</Chip>)}</div></div>
      )}
      {!auto && ["visita", "hora", "area", "pres"].includes(s.k) && (
        <div><div className={K}>{E2("¿DÓNDE ES?", "WHERE IS IT?")}</div>
          <div className="mt-2 flex flex-wrap gap-2">{AREAS.map(([k, l1, l2]) => <Chip key={k} variant={area === k ? "selected" : "filter"} onClick={() => setArea(area === k ? null : k)}>{es ? l1 : l2}</Chip>)}</div></div>
      )}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{auto ? E2("¿QUÉ LE PASA? · OPCIONAL", "WHAT IS WRONG? · OPTIONAL") : E2("¿QUÉ PASA? · OPCIONAL", "WHAT IS HAPPENING? · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/400</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 400))} rows={3} aria-label={auto ? E2("Qué le pasa", "What is wrong") : E2("Qué pasa", "What is happening")}
          placeholder={auto ? E2("Ej.: chilla al frenar y el timón tiembla", "E.g. squeals when braking and the wheel shakes") : E2("Ej.: gotea debajo del fregadero desde ayer", "E.g. leaking under the sink since yesterday")}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      {desdeK && (
        <div><div className={K}>{E2("FOTOS · OPCIONAL", "PHOTOS · OPTIONAL")}</div>
          <div className="mt-[9px] flex flex-wrap gap-2.5">
            {fotos.map((f) => <span key={f.id} className="relative h-[68px] w-[68px] rounded-[13px] bg-photo-bg" style={{ backgroundImage: `url(${f.url})`, backgroundSize: "cover" }}><button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button></span>)}
            {fotos.length < 6 && <button type="button" disabled={subiendo} onClick={() => fileRef.current?.click()} className="box-border flex h-[68px] w-[68px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55"><Icon name="image" size={18} color="rgba(11,14,18,.55)" /><span className="text-[10.5px] font-bold">{subiendo ? "…" : E2("Agregar", "Add")}</span></button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
          </div></div>
      )}
    </div>
  );
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0">{dias.length ? <DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); }} /> : <div className="h-[66px]" />}</div></div>
      {cargando && !H ? <div className="h-24 animate-pulse rounded-[15px] bg-paper" /> : hayLibres ? (
        <div aria-busy={cargando}><div className={K}>{auto ? E2("HORA", "TIME") : E2("LLEGA ENTRE", "ARRIVES BETWEEN")}</div><div className="mt-[9px] grid"><TimeSlots slots={slots.map(({ t, taken }) => ({ t, taken }))} selected={hSel != null ? slotL(hSel) : ""} onSelect={(t: string) => { const x = slots.find((z) => z.t === t && !z.taken); if (x) setH(x.m); }} /></div></div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
          <div className="text-[13.5px] font-bold leading-[1.4]">{auto ? E2(`No quedan horas el ${diaL}`, `No times left on ${diaL}`) : E2(`No quedan franjas el ${diaL}`, `No windows left on ${diaL}`)}</div>
          {H?.sig && <button type="button" onClick={() => { setI(H.sig!.i); setH(null); }} className="text-left text-[12.5px] font-bold text-action">{E2(`Ver el siguiente día libre · desde las ${horaL(H.sig.m)}`, `See the next open day · from ${horaL(H.sig.m)}`)}</button>}
        </div>
      )}
      {hSel != null && <div className="flex items-center gap-[9px] rounded-[13px] bg-action/[.07] px-[13px] py-[11px]"><Icon name="clock" size={15} color="var(--tl-action)" /><span className="text-[12.5px] font-bold leading-[1.4] text-action-hover">{cuandoL}</span></div>}
      {auto && <div className="text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/55">{a.days ? E2(`Lo tienen ${a.days[0]}–${a.days[1]} días en el taller. Te avisan cuando esté listo.`, `They keep it ${a.days[0]}–${a.days[1]} days at the shop. They let you know when it is ready.`) : `${wL}.`}</div>}
      {!auto && s.k !== "pres" && (
        <div className="border-t border-ink/[.07] pt-3.5"><div className={K}>{E2("¿VAS A ESTAR EN CASA?", "WILL YOU BE HOME?")}</div>
          <div className="mt-2 flex flex-wrap gap-2">{([["casa", E2("Sí, estaré en casa", "Yes, I will be home")], ["llave", E2("No: dejo cómo entrar", "No: I leave access instructions")]] as const).map(([k, l]) => <Chip key={k} variant={acceso === k ? "selected" : "filter"} onClick={() => setAcceso(k)}>{l}</Chip>)}</div>
          {acceso === "llave" && <input aria-label={E2("Cómo entrar", "Access")} value={accNota} onChange={(e) => setAccNota(e.target.value.slice(0, 120))} placeholder={E2("Ej.: la llave está con la vecina del 114", "E.g. the key is with the neighbor at 114")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 text-[13px] font-semibold outline-none" />}
        </div>
      )}
    </div>
  );
  const filas: [string, string][] = [[E2("SERVICIO", "SERVICE"), nm(s.name)], [auto ? E2("VEHÍCULO", "VEHICLE") : E2("CASA", "HOME"), auto && v.veh ? vehName(v.veh, es) : v.casa?.dir ?? "—"],
    [E2("CUÁNDO", "WHEN"), cuandoL], ...(auto ? [[E2("TU CARRO", "YOUR CAR"), a.days ? E2(`En el taller ${a.days[0]}–${a.days[1]} días`, `At the shop ${a.days[0]}–${a.days[1]} days`) : wL] as [string, string]] : [[E2("DÓNDE", "WHERE"), area ? (AREAS.find((z) => z[0] === area)?.[es ? 1 : 2] ?? "") : E2("Tu casa", "Your home")] as [string, string]]),
    [E2("NEGOCIO", "BUSINESS"), op.negocio.nombre]];
  // Cómo se cobra (diseño payNote): hoy · al llegar o al dejarlo · al terminar.
  const como: [string, string][] = auto ? [[E2("Hoy", "Today"), dep ? E2(`Depósito de ${dinero(dep)}; se descuenta del total.`, `${dinero(dep)} deposit; taken off the total.`) : E2("No se cobra nada.", "Nothing is charged.")],
    [E2("Antes de tocar el carro", "Before touching the car"), desdeK ? E2("Te llega el estimado línea por línea; apruebas solo lo que quieras.", "The estimate reaches you line by line; you approve only what you want.") : E2("El precio es el publicado.", "The price is the posted one.")],
    [E2("Al recogerlo", "At pickup"), E2("Se cobra lo final (nunca más de lo aprobado).", "The final amount is charged (never more than approved).")]]
    : [[E2("Hoy", "Today"), dep ? E2(`Depósito de ${dinero(dep)}; se descuenta del total.`, `${dinero(dep)} deposit; taken off the total.`) : E2("$0. No se cobra nada.", "$0. Nothing is charged.")],
      [E2("Al llegar", "On arrival"), desdeK ? E2("Revisa o mide y te manda el precio completo; tú decides.", "They check or measure and send the full price; you decide.") : E2("El precio cerrado, el publicado.", "The fixed price, as posted.")],
      [E2("Al terminar", "When done"), E2("Revisas el trabajo y se cobra lo final.", "You check the work and the final amount is charged.")]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{auto ? E2("TU CITA", "YOUR BOOKING") : E2("TU VISITA", "YOUR VISIT")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{op.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const rest = Math.max(0, total - dep);
  const pay = {
    screenLabel: "Booking · pago", priceLabel: E2("PRECIO", "PRICE"), lines: [{ label: nm(s.name), sub: ol.map((x) => `${nm(x.g.t)}: ${nm(x.o!.n).toLowerCase()}`).join(" · ") || undefined, value: precioL }, ...al.map((x) => ({ label: nm(x.n), value: dinero(x.p) }))],
    totalLabel: desdeK ? E2("Desde", "From") : E2("Total del servicio", "Service total"), total: s.k === "cotiza" ? E2("Se cotiza", "Quoted") : dinero(total), howLabel: E2("CÓMO SE COBRA", "HOW YOU PAY"),
    bar: dep > 0 && rest > 0 ? { a: dep, b: rest } : null,
    rows: como.map(([label, sub], k) => ({ label, sub, value: k === 0 ? dinero(dep) : k === 2 && !desdeK ? dinero(rest) : "—", dot: k === 0 && dep ? "var(--tl-ink)" : "rgba(11,14,18,.18)", color: "var(--tl-ink)" })),
    card: necesitaTarjeta ? { screenLabel: "Booking · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : op.pol.auto ? E2("EL DEPÓSITO SE COBRA AL CONFIRMAR", "DEPOSIT CHARGED ON CONFIRMATION") : E2("EL DEPÓSITO SE RETIENE AL ENVIAR", "DEPOSIT HELD WHEN YOU SEND"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const dev = `${E2("Te devolvemos ", "We refund ")}${dinero(dep)}`, GR = "var(--tl-open-text)";
  const salidas = dep > 0 ? { screenLabel: "Booking · tu depósito", title: `${E2("Tu depósito de ", "Your deposit of ")}${dinero(dep)}`.toUpperCase(),
    rows: [...(op.pol.auto ? [] : [[E2(`${op.negocio.nombre} no puede`, `${op.negocio.nombre} cannot`), E2("Te propone otra hora", "Proposes another time"), "var(--tl-action)"], [E2(`No contesta en ${op.pol.exp} h`, `No reply in ${op.pol.exp} h`), dev, GR]]),
      [E2(`Cancelas hasta ${op.pol.cxh} h antes`, `You cancel up to ${op.pol.cxh} h before`), dev, GR], [auto ? E2("Cancelas después o no llegas", "You cancel later or do not show") : E2("Cancelas después o no estás", "You cancel later or are not home"), `${E2("Se queda con ", "Kept by ")}${op.negocio.nombre}`, "var(--tl-danger)"]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: E2("Los reembolsos vuelven a tu tarjeta en 3 a 5 días hábiles.", "Refunds go back to your card in 3 to 5 business days.") } : null;
  const toggle = (on: boolean, set: (x: boolean) => void, t: string, s2: string) => (
    <div role="switch" aria-checked={on} aria-label={t} tabIndex={0} onClick={() => set(!on)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(!on); } }} className="flex cursor-pointer items-center gap-3 border-t border-ink/[.07] pt-3.5 first:border-0 first:pt-0">
      <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{t}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{s2}</div></div>
      <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${on ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${on ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      {inq && toggle(landlord, setLandlord, E2("Tengo el permiso de mi landlord", "I have my landlord’s permission"), E2("Obligatorio si alquilas: el negocio lo puede pedir al llegar.", "Required if you rent: the business may ask for it on arrival."))}
      {!(auto && ["lav", "insp"].includes(s.k)) && toggle(piezas, setPiezas, auto ? E2("Guárdame las piezas viejas", "Keep my old parts") : E2("Déjame las piezas que cambien", "Leave me the parts they replace"), E2("Te las entregan al terminar.", "They hand them to you when done."))}
      {toggle(sms, setSms, E2("Recordatorio", "Reminder"), E2("Te recordamos la cita en Avisos.", "We remind you of the booking in Alerts."))}
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = op.pol.auto ? E2("Confirmar cita", "Confirm booking") : E2("Enviar solicitud", "Send request");
  const payK = dep ? E2("HOY PAGAS", "TODAY YOU PAY") : E2("HOY", "TODAY"), payV = dinero(dep);
  const label = auto ? "APP-NEG-AUTO-BOOKING" : "APP-NEG-HOGAR-BOOKING";

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label={`${label} · móvil`} className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaSvc}{bloqueDato}</>}
          {paso === 1 && bloqueHora}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{extras}</>}
          {errorBox}
        </div>
        <div data-screen-label="Booking · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{paso === 2 ? payK : desdeK ? E2("DESDE", "FROM") : "TOTAL"}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{paso === 2 ? payV : s.k === "cotiza" ? E2("Se cotiza", "Quoted") : dinero(total)}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label={`${label} · desktop`} className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{op.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">Booking</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${op.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[0]}</div><div className="flex flex-col gap-3">{tarjetaSvc}{bloqueDato}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[1]}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{extras}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{payV}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      <HojaVehiculo v={v} />
      <HojaCasa v={v} />
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TU DEPÓSITO DE ", "FOR YOUR ")}${dinero(dep)}${E2("", " DEPOSIT")} · ${op.pol.auto ? E2("SE COBRA AL CONFIRMAR", "CHARGED ON CONFIRMATION") : E2("SE RETIENE AL ENVIAR · SE COBRA AL CONFIRMAR", "HELD WHEN YOU SEND · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
