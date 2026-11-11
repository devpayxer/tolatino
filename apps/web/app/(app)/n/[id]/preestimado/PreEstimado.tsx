"use client";
/* APP-NEG-AUTO-PREEST y APP-NEG-HOGAR-PREEST (diseño neg-auto-pre.js / neg-hogar-pre.js › formVals): tu vehículo o tu
   casa, qué pasa (luces y código del escáner en Auto; dónde es, marca y edad del equipo en Hogar), fotos 1–6, para cuándo,
   cómo funciona y lo que falta. Gratis, no te compromete; pedirlo pide entrar. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { OficiosPublico } from "@/lib/oficios-publico";
import { subirFoto } from "@/lib/subir-foto";
import { HojaCasa, HojaVehiculo, casaMeta, compatCasa, compatVeh, useOficio, vehMeta, vehName } from "../Oficios";
import { pedirPreEstimado } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const LIGHTS: [string, string, string][] = [["ce", "Check engine", "Check engine"], ["bat", "Batería", "Battery"], ["temp", "Temperatura", "Temperature"], ["abs", "Frenos o ABS", "Brakes or ABS"], ["oil", "Aceite", "Oil"], ["tpms", "Presión de gomas", "Tire pressure"]];
const AREAS: [string, string, string][] = [["cocina", "Cocina", "Kitchen"], ["bano", "Baño", "Bathroom"], ["sotano", "Sótano", "Basement"], ["cuarto", "Cuarto", "Bedroom"], ["sala", "Sala", "Living room"], ["afuera", "Afuera", "Outside"], ["toda", "Toda la casa", "Whole house"]];

export function PreEstimado({ op, svcId, es, yo }: { op: OficiosPublico; svcId: string; es: boolean; yo: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const v = useOficio(op, es, yo)!;
  const s = op.servicios.find((x) => x.id === svcId)!, auto = op.rubro === "auto", nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [luces, setLuces] = useState<string[]>([]), [area, setArea] = useState<string | null>(null), [nota, setNota] = useState(""), [code, setCode] = useState("");
  const [marca, setMarca] = useState(""), [edad, setEdad] = useState(""), [cuando, setCuando] = useState("sem");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null), clave = useRef(uuid());
  const cp = auto ? compatVeh(op, v.veh, es) : compatCasa(op, v.casa, es), dato = auto ? v.veh : v.casa;
  const resp = op.pol.resp * 3 >= 60 ? `${Math.round((op.pol.resp * 3) / 60)} h` : `${Math.max(30, op.pol.resp * 3)} min`;
  const okSym = auto ? luces.length > 0 || nota.trim().length >= 10 : nota.trim().length >= 10;
  const miss = [!dato ? (auto ? E2("Agrega tu vehículo", "Add your vehicle") : E2("Agrega tu casa", "Add your home")) : null, cp && !cp.ok ? cp.t : null, !auto && !area ? E2("Elige dónde es", "Choose where it is") : null,
    !fotos.length ? E2("Agrega al menos una foto", "Add at least one photo") : null, !okSym ? (auto ? E2("Cuéntanos qué le pasa", "Tell us what is wrong") : E2("Cuéntanos qué pasa (al menos 10 letras)", "Tell us what is going on (at least 10 characters)")) : null].filter(Boolean) as string[];
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 6) return;
    if (!yo) return entrar();
    setSubiendo(true); const r = await subirFoto(file); setSubiendo(false);
    if (r.ok && r.id && r.url) setFotos((L) => [...L, { id: r.id!, url: r.url! }]); else setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const enviar = async () => {
    if (!yo) return entrar();
    if (miss.length || ocupado) return;
    setOcupado(true); setError(null);
    const r = await pedirPreEstimado({ negocio: op.negocio.id, svc: s.id, luces, nota, code, cuando, area, marca, edad, fotos: fotos.map((f) => f.id), clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) router.push(`/pre/${r.numero}`); else setError(es ? r.msg.es : r.msg.en);
  };
  const WHEN: [string, string, string][] = [["hoy", E2("Lo necesito hoy", "I need it today"), auto ? E2("Te dicen si hay hueco hoy", "They tell you if there is room today") : E2("Te dicen si hay franja hoy", "They tell you if there is a window today")],
    ["sem", E2("Esta semana", "This week"), ""], ["nada", E2("Sin prisa", "No rush"), E2("Solo quiero saber cuánto sale", "I just want to know the price")]];
  const como = [E2(auto ? "Mandas fotos y cuentas qué le pasa." : "Mandas fotos y cuentas qué pasa.", auto ? "You send photos and say what is wrong." : "You send photos and say what is going on."),
    E2(`${op.negocio.nombre} te responde aquí con un rango, en unas ${resp} en horario de trabajo.`, `${op.negocio.nombre} replies here with a range, in about ${resp} during work hours.`),
    auto ? E2("Si te sirve, reservas con un toque. El precio real sale en el estimado, después de verlo. Nada se hace ni se cobra sin tu OK.", "If it works for you, book with one tap. The real price comes in the estimate after they see it. Nothing is done or charged without your OK.")
      : E2("Si te sirve, reservas con un toque. El precio completo te llega antes de empezar. Nada se hace ni se cobra sin tu OK.", "If it works for you, book with one tap. The full price reaches you before they start. Nothing is done or charged without your OK.")];
  const cuerpo = (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-3 p-3.5 ${caja}`}>
        <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
        <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
          <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{op.negocio.nombre.toUpperCase()}</div>
          <span className="mt-2 inline-block rounded-[9px] bg-signal/20 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-open-text">{E2("GRATIS · NO TE COMPROMETE", "FREE · NO COMMITMENT")}</span></div>
      </div>
      <div className={`flex flex-col gap-4 p-4 ${caja}`}>
        <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{auto ? E2("Tu vehículo", "Your vehicle") : E2("Tu casa", "Your home")}</div>
        <button type="button" onClick={() => v.setSheet(auto ? "veh" : "casa")} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
          <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name={auto ? "car" : "home"} size={20} color="var(--tl-white)" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{dato ? (auto ? E2("TU VEHÍCULO", "YOUR VEHICLE") : E2("TU CASA", "YOUR HOME")) : E2("OBLIGATORIO", "REQUIRED")}</span>
            <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{auto ? (v.veh ? vehName(v.veh, es) : E2("Agrega tu vehículo", "Add your vehicle")) : v.casa ? v.casa.dir : E2("Agrega tu casa", "Add your home")}</span>
            {dato && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{auto && v.veh ? vehMeta(v.veh, es) : v.casa ? casaMeta(v.casa, es) : ""}</span>}
            {cp && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: cp.ok ? "var(--tl-open-text)" : "var(--tl-danger)" }}><Icon name={cp.ok ? "check" : "warning"} size={13} color="currentColor" />{cp.t}</span>}
          </span>
          <span className="flex-none text-[12.5px] font-bold text-action">{dato ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
        </button>
      </div>
      <div className={`flex flex-col gap-4 p-4 ${caja}`}>
        <div><div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{auto ? E2("¿Qué le pasa?", "What is wrong?") : E2("¿Qué pasa?", "What is going on?")}</div>
          <div className="mt-1 text-[12px] font-medium text-ink/55">{E2("Mientras más detalle, más cerrado el rango.", "The more detail, the tighter the range.")}</div></div>
        {auto ? (
          <div><div className={K}>{E2("LUCES ENCENDIDAS", "WARNING LIGHTS ON")}</div>
            <div className="mt-2 flex flex-wrap gap-2">{LIGHTS.map(([k, l1, l2]) => <Chip key={k} variant={luces.includes(k) ? "selected" : "filter"} onClick={() => setLuces(luces.includes(k) ? luces.filter((z) => z !== k) : [...luces, k])}>{es ? l1 : l2}</Chip>)}</div></div>
        ) : (
          <div><div className={K}>{E2("¿DÓNDE ES?", "WHERE IS IT?")}</div>
            <div className="mt-2 flex flex-wrap gap-2">{AREAS.map(([k, l1, l2]) => <Chip key={k} variant={area === k ? "selected" : "filter"} onClick={() => setArea(area === k ? null : k)}>{es ? l1 : l2}</Chip>)}</div></div>
        )}
        <div>
          <div className="flex justify-between gap-2.5"><span className={K}>{E2("CUÉNTANOS", "TELL US")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 400</span></div>
          <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 400))} rows={3} aria-label={auto ? E2("Qué le pasa", "What is wrong") : E2("Qué pasa", "What is going on")}
            placeholder={auto ? E2("Ej.: chilla al frenar desde hace una semana, más en la mañana…", "E.g. squeals when braking for a week, worse in the morning…") : E2("Ej.: gotea debajo del fregadero desde ayer…", "E.g. leaking under the sink since yesterday…")}
            className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        </div>
        {auto ? (
          <div><div className={K}>{E2("CÓDIGO DEL ESCÁNER · SI LO TIENES", "SCANNER CODE · IF YOU HAVE IT")}</div>
            <input aria-label={E2("Código del escáner", "Scanner code")} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9 ,]/g, "").slice(0, 20))} placeholder="P0420"
              className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] font-mono text-[13px] font-semibold outline-none" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <div><div className={K}>{E2("MARCA DEL EQUIPO", "EQUIPMENT BRAND")}</div><input aria-label={E2("Marca del equipo", "Equipment brand")} value={marca} onChange={(e) => setMarca(e.target.value.slice(0, 40))} placeholder={E2("Ej.: Moen", "E.g. Moen")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] text-[13px] font-medium outline-none" /></div>
            <div><div className={K}>{E2("¿QUÉ EDAD TIENE?", "HOW OLD?")}</div><input aria-label={E2("Edad del equipo", "Equipment age")} value={edad} onChange={(e) => setEdad(e.target.value.slice(0, 20))} placeholder={E2("Ej.: 10 años", "E.g. 10 years")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] text-[13px] font-medium outline-none" /></div>
          </div>
        )}
      </div>
      <div className={`flex flex-col gap-3 p-4 ${caja}`}>
        <div className="flex items-baseline justify-between gap-2.5"><span className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Fotos", "Photos")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 6</span></div>
        <div className="text-[12px] font-medium leading-[1.5] text-ink/55">{auto ? E2("La pieza, la luz del tablero o donde suena.", "The part, the dash light or where the noise is.") : E2("Lo que se ve: la fuga, el equipo, la pared o la medida.", "What you can see: the leak, the equipment, the wall or the size.")}</div>
        <div className="flex flex-wrap gap-2.5">
          {fotos.map((f) => <span key={f.id} className="relative h-[76px] w-[76px] rounded-[13px] bg-photo-bg" style={{ backgroundImage: `url(${f.url})`, backgroundSize: "cover" }}><button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button></span>)}
          {fotos.length < 6 && <button type="button" disabled={subiendo} onClick={() => (yo ? fileRef.current?.click() : entrar())} className="box-border flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55"><Icon name="image" size={18} color="rgba(11,14,18,.5)" /><span className="text-[10.5px] font-bold">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Foto", "Photo")}</span></button>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      <div className={`flex flex-col gap-2.5 p-4 ${caja}`} role="radiogroup" aria-label={E2("¿Para cuándo?", "When do you need it?")}>
        <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Para cuándo?", "When do you need it?")}</div>
        {WHEN.map(([k, l, sub]) => { const on = cuando === k; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setCuando(k)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
            <span className={`h-[18px] w-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{l}</span>{sub && <span className="mt-0.5 block text-[12px] font-medium text-ink/55">{sub}</span>}</span>
          </button>); })}
      </div>
      <div className={`p-4 ${caja}`}>
        <div className={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</div>
        <div className="mt-3 flex flex-col gap-2.5">{como.map((t, i) => <div key={i} className="flex items-start gap-2.5"><span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
        <div className="mt-3 text-pretty text-[11.5px] font-semibold leading-[1.5] text-ink/55">{E2("Es un rango, no un precio final: con fotos no se ve todo. Pedirlo es gratis y no te compromete.", "It is a range, not a final price: photos do not show everything. It is free and there is no commitment.")}</div>
      </div>
      {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
    </div>
  );
  const barra = (
    <div className="flex flex-col gap-2">
      {miss.length > 0 && <div className="text-[12px] font-semibold leading-[1.45] text-ink/60"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TE FALTA · ", "STILL NEEDED · ")}</span>{miss.join(" · ")}</div>}
      <div className="grid"><Button block icon="image" disabled={miss.length > 0 || ocupado} onClick={enviar}>{ocupado ? E2("Enviando…", "Sending…") : E2("Enviar para pre-estimado", "Send for pre-estimate")}</Button></div>
    </div>
  );
  return (
    <div data-screen-label={auto ? "APP-NEG-AUTO-PREEST" : "APP-NEG-HOGAR-PREEST"} className="min-h-[100dvh] bg-paper pb-[170px] lg:pb-14">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${op.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Pre-estimado con fotos", "Pre-estimate from photos")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${nm(s.name)} · ${op.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto max-w-[620px] px-4 pt-4">{cuerpo}<div className="mt-4 hidden lg:block">{barra}</div></div>
      <div data-screen-label="Pre-estimado · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">{barra}</div>
      <HojaVehiculo v={v} />
      <HojaCasa v={v} />
    </div>
  );
}
