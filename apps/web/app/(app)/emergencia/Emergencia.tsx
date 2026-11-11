"use client";
/* APP-NEG-HOGAR-EMERGENCIA (diseño neg-hogar-mas.js › emForm): tu casa, qué pasa (elige uno), cómo entrar si no estás,
   fotos opcionales (hasta 3), para cuándo (ahora o en 3 horas, con el rango de salidas con recargo), cómo funciona y la línea
   del 911, que nunca se suaviza. Hoy no se cobra nada. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Casa, OficiosPublico } from "@/lib/oficios-publico";
import { HojaCasa, useOficio } from "../n/[id]/Oficios";
import { subirFoto } from "@/lib/subir-foto";
import { pedirEmergencia } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
export type OpcionEm = { ek: string; t: { es: string; en: string }; n: number; lo: number; hi: number };

export function Emergencia({ opciones, casa: casa0, es, yo, desde, ek0, linea911, op }: { opciones: OpcionEm[]; casa: Casa | null; es: boolean; yo: boolean; desde: string | null; ek0: string | null; linea911: { es: string; en: string }; op: OficiosPublico | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  // Tu casa: con la hoja «Tu casa» del negocio de donde vienes (la misma de la ficha); al guardarla se recalculan los que llegan.
  const v = useOficio(op, es, yo), casa = v ? v.casa : casa0;
  const casaId = casa?.id ?? null, primera = useRef(casaId);
  useEffect(() => { if (casaId !== primera.current) { primera.current = casaId; router.refresh(); } }, [casaId, router]);
  const [ek, setEk] = useState<string | null>(ek0), [nota, setNota] = useState(""), [acceso, setAcceso] = useState(""), [cuando, setCuando] = useState("now");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null), clave = useRef(uuid());
  const o = opciones.find((x) => x.ek === ek) ?? null;
  const miss = [!ek ? E2("Elige qué pasa", "Pick what is going on") : null, !casa ? E2("Agrega tu casa", "Add your home") : null,
    ek && casa && o && !o.n ? E2("Nadie 24/7 llega hasta tu casa para esto. Llama a uno directo.", "No 24/7 business reaches your home for this. Call one directly.") : null].filter(Boolean) as string[];
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 3) return;
    if (!yo) return entrar();
    setSubiendo(true); const r = await subirFoto(file); setSubiendo(false);
    if (r.ok && r.id && r.url) setFotos((L) => [...L, { id: r.id!, url: r.url! }]); else setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const enviar = async () => {
    if (!yo) return entrar();
    if (miss.length || ocupado || !ek) return;
    setOcupado(true); setError(null);
    const r = await pedirEmergencia({ ek, nota, acceso, cuando, fotos: fotos.map((f) => f.id), clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) router.push(`/pre/${r.numero}`); else setError(es ? r.msg.es : r.msg.en);
  };
  const como = [E2(`Se lo mandamos a ${o?.n ? `${o.n} negocios` : "los negocios"} 24/7 que llegan a tu casa.`, `We send it to ${o?.n ? `${o.n} businesses` : "the businesses"} on 24/7 call that reach your home.`),
    E2("El primero que acepta, va. Ves su nombre, su precio de salida y cuándo llega.", "The first to accept comes. You see their name, call-out price and arrival time."),
    E2("Hoy no se cobra nada. La salida se paga al terminar; lo demás te lo cotizan antes en la app.", "Nothing is charged now. The call-out is paid when done; anything else is quoted in the app first.")];
  const rango = o?.n ? (o.lo === o.hi ? dinero(o.lo) : `${dinero(o.lo)}–${dinero(o.hi)}`) : "";
  const barra = (
      <div className="flex flex-col gap-2">
        {miss.length > 0 && <div className="text-[12px] font-semibold leading-[1.45] text-ink/60"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TE FALTA · ", "STILL NEEDED · ")}</span>{miss.join(" · ")}</div>}
        <div className="flex items-center justify-between gap-2"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-open-text">{E2("HOY NO SE COBRA NADA", "NOTHING IS CHARGED NOW")}</span></div>
        <div className="grid"><Button block variant="danger" icon="warning" disabled={miss.length > 0 || ocupado} onClick={enviar}>{ocupado ? E2("Enviando…", "Sending…") : E2("Pedir ayuda ahora", "Get help now")}</Button></div>
      </div>
    );
  return (
    <div data-screen-label="APP-NEG-HOGAR-EMERGENCIA" className="min-h-[100dvh] bg-paper pb-[170px] lg:pb-14">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(desde ? `/n/${desde}?tab=svc` : "/")} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Emergencia en casa", "Home emergency")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{E2("SE MANDA A TODOS LOS QUE ATIENDEN 24/7 EN TU ZONA", "SENT TO EVERYONE ON 24/7 CALL IN YOUR AREA")}</div></div>
      </div>
      <div className="mx-auto flex max-w-[620px] flex-col gap-3 px-4 pt-4">
        <div role="note" data-screen-label="Emergencia · 911" className="flex items-start gap-2.5 rounded-[14px] bg-danger/[.09] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="warning" size={16} color="var(--tl-danger)" /></span><span className="text-pretty text-[13px] font-extrabold leading-[1.4] text-danger">{es ? linea911.es : linea911.en}</span></div>
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Tu casa", "Your home")}</div>
          <button type="button" onClick={() => (v ? v.setSheet("casa") : router.push(`/cuenta/direcciones?volver=${encodeURIComponent("/emergencia")}`))} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
            <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="home" size={20} color="var(--tl-white)" /></span>
            <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{casa ? E2("TU CASA", "YOUR HOME") : E2("OBLIGATORIO", "REQUIRED")}</span>
              <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{casa ? casa.dir : E2("Agrega tu casa", "Add your home")}</span></span>
            <span className="flex-none text-[12.5px] font-bold text-action">{casa ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
          </button>
        </div>
        <div className={`flex flex-col gap-4 p-4 ${caja}`}>
          <div><div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Qué pasa?", "What is going on?")}</div>
            <div className="mt-1 text-[12px] font-medium text-ink/55">{E2("Elige lo más cercano. Solo reciben tu pedido los que hacen ese trabajo.", "Pick the closest one. Only businesses that do that job get your request.")}</div></div>
          <div><div className={K}>{E2("ELIGE UNO", "PICK ONE")}</div>
            <div className="mt-2 flex flex-wrap gap-2">{opciones.map((x) => <Chip key={x.ek} variant={ek === x.ek ? "selected" : "filter"} onClick={() => setEk(ek === x.ek ? null : x.ek)}>{es ? x.t.es : x.t.en}</Chip>)}</div></div>
          <div>
            <div className="flex justify-between gap-2.5"><span className={K}>{E2("CUÉNTALES · OPCIONAL", "TELL THEM · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 300</span></div>
            <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={2} aria-label={E2("Qué pasa", "What is going on")} placeholder={E2("Ej.: se reventó un tubo en el sótano, ya cerré la llave principal…", "E.g. a pipe burst in the basement, I already shut the main valve…")}
              className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
          </div>
          <div><div className={K}>{E2("CÓMO ENTRAR · SI NO ESTÁS", "HOW TO GET IN · IF YOU ARE NOT HOME")}</div>
            <input aria-label={E2("Cómo entrar", "How to get in")} value={acceso} onChange={(e) => setAcceso(e.target.value.slice(0, 80))} placeholder={E2("Ej.: puerta del lado, estoy en casa de la vecina", "E.g. side door, I am at the neighbor’s")}
              className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] text-[13px] font-medium outline-none" /></div>
        </div>
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div className="flex items-baseline justify-between gap-2.5"><span className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Fotos · opcional", "Photos · optional")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 3</span></div>
          <div className="text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Si puedes, una foto ayuda a que traigan lo que hace falta.", "If you can, a photo helps them bring what is needed.")}</div>
          <div className="flex flex-wrap gap-2.5">
            {fotos.map((f) => <span key={f.id} className="relative h-[76px] w-[76px] rounded-[13px] bg-photo-bg" style={{ backgroundImage: `url(${f.url})`, backgroundSize: "cover" }}><button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button></span>)}
            {fotos.length < 3 && <button type="button" disabled={subiendo} onClick={() => (yo ? fileRef.current?.click() : entrar())} className="box-border flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55"><Icon name="image" size={18} color="rgba(11,14,18,.5)" /><span className="text-[10.5px] font-bold">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Foto", "Photo")}</span></button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        <div className={`flex flex-col gap-2.5 p-4 ${caja}`} role="radiogroup" aria-label={E2("¿Para cuándo?", "When?")}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Para cuándo?", "When?")}</div>
          {([["now", E2("Ahora mismo", "Right now"), rango ? `${E2("Salida con recargo: ", "Call-out with surcharge: ")}${rango}` : ""], ["3h", E2("En las próximas 3 horas", "Within 3 hours"), E2("Mismo precio de emergencia", "Same emergency price")]] as const).map(([k, l, sub]) => { const on = cuando === k; return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setCuando(k)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
              <span className={`h-[18px] w-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{l}</span>{sub && <span className="mt-0.5 block text-[12px] font-medium text-ink/55">{sub}</span>}</span>
            </button>); })}
        </div>
        <div className={`p-4 ${caja}`}>
          <div className={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</div>
          <div className="mt-3 flex flex-col gap-2.5">{como.map((t, i) => <div key={i} className="flex items-start gap-2.5"><span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
        </div>
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div className="hidden lg:block">{barra}</div>
      </div>
      {v && <HojaCasa v={v} />}
      <div data-screen-label="Emergencia · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">{barra}</div>
    </div>
  );
}
