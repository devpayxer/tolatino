"use client";
/* APP-NEG-HOGAR-PRESUPUESTOS (diseño neg-hogar-mas.js › pqForm): «Presupuesto a hasta 3». Tu casa, qué quieres hacer (lo
   mismo para todos, para poder comparar), dónde, medidas, fotos y a quién se lo mandas (hasta 3; el de la ficha primero; los
   que no llegan a tu casa no se eligen). Gratis, no te compromete. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { OficiosPublico } from "@/lib/oficios-publico";
import type { CandPq } from "@/lib/solicitudes";
import { subirFoto } from "@/lib/subir-foto";
import { HojaCasa, casaMeta, compatCasa, useOficio } from "../Oficios";
import { pedirPresupuestos } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const AREAS: [string, string, string][] = [["cocina", "Cocina", "Kitchen"], ["bano", "Baño", "Bathroom"], ["sotano", "Sótano", "Basement"], ["techo", "Techo", "Roof"], ["afuera", "Afuera", "Outside"], ["toda", "Toda la casa", "Whole house"]];

export function Presupuestos({ op, svcId, cands, es, yo }: { op: OficiosPublico; svcId: string; cands: CandPq[]; es: boolean; yo: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const v = useOficio(op, es, yo)!;
  const s = op.servicios.find((x) => x.id === svcId)!, nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [areas, setAreas] = useState<string[]>([]), [nota, setNota] = useState(""), [medidas, setMedidas] = useState("");
  const [sel, setSel] = useState<string[]>(cands.filter((c) => c.id === op.negocio.id && c.ok).map((c) => c.id));
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null), clave = useRef(uuid());
  const cp = compatCasa(op, v.casa, es);
  const miss = [!v.casa ? E2("Agrega tu casa", "Add your home") : null, !sel.length ? E2("Elige al menos un negocio", "Pick at least one business") : null,
    !fotos.length ? E2("Agrega al menos una foto", "Add at least one photo") : null, nota.trim().length < 10 ? E2("Cuéntales qué quieres hacer", "Tell them what you want done") : null].filter(Boolean) as string[];
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
    const r = await pedirPresupuestos({ negocio: op.negocio.id, svc: s.id, negocios: sel, areas, nota, medidas, fotos: fotos.map((f) => f.id), clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) router.push(`/pre/${r.numero}`); else setError(es ? r.msg.es : r.msg.en);
  };
  const n = sel.length;
  const como = [E2(`Mandas la misma solicitud a ${n || "hasta 3"} ${n === 1 ? "negocio" : "negocios"}.`, `You send the same request to ${n || "up to 3"} ${n === 1 ? "business" : "businesses"}.`),
    E2("Cada uno responde aquí con un rango y lo que cobra por la visita, en 48 horas.", "Each replies here with a range and what the visit costs, within 48 hours."),
    E2("Comparas y reservas la visita de uno. Los otros se cierran solos; no se cobra nada.", "Compare and book one visit. The others close on their own; nothing is charged.")];
  const cuerpo = (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-3 p-3.5 ${caja}`}>
        <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
        <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
          <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{E2("LA MISMA SOLICITUD A CADA UNO", "THE SAME REQUEST TO EACH")}</div>
          <span className="mt-2 inline-block rounded-[9px] bg-signal/20 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-open-text">{E2("GRATIS · NO TE COMPROMETE", "FREE · NO COMMITMENT")}</span></div>
      </div>
      <div className={`flex flex-col gap-4 p-4 ${caja}`}>
        <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Tu casa", "Your home")}</div>
        <button type="button" onClick={() => v.setSheet("casa")} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
          <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="home" size={20} color="var(--tl-white)" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{v.casa ? E2("TU CASA", "YOUR HOME") : E2("OBLIGATORIO", "REQUIRED")}</span>
            <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{v.casa ? v.casa.dir : E2("Agrega tu casa", "Add your home")}</span>
            {v.casa && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{casaMeta(v.casa, es)}</span>}
            {cp && !cp.ok && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold text-danger"><Icon name="warning" size={13} color="currentColor" />{cp.t}</span>}
          </span>
          <span className="flex-none text-[12.5px] font-bold text-action">{v.casa ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
        </button>
      </div>
      <div className={`flex flex-col gap-4 p-4 ${caja}`}>
        <div><div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Qué quieres hacer?", "What do you want done?")}</div>
          <div className="mt-1 text-[12px] font-medium text-ink/55">{E2("Lo mismo para todos, así los presupuestos se pueden comparar.", "The same for everyone, so the estimates can be compared.")}</div></div>
        <div><div className={K}>{E2("¿DÓNDE?", "WHERE?")}</div>
          <div className="mt-2 flex flex-wrap gap-2">{AREAS.map(([k, l1, l2]) => <Chip key={k} variant={areas.includes(k) ? "selected" : "filter"} onClick={() => setAreas(areas.includes(k) ? areas.filter((z) => z !== k) : [...areas, k])}>{es ? l1 : l2}</Chip>)}</div></div>
        <div>
          <div className="flex justify-between gap-2.5"><span className={K}>{E2("CUÉNTALES", "TELL THEM")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 500</span></div>
          <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 500))} rows={3} aria-label={E2("Qué quieres hacer", "What you want done")}
            placeholder={E2("Ej.: cambiar la bañera por ducha, loza nueva en piso y pared…", "E.g. replace the tub with a shower, new floor and wall tile…")}
            className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        </div>
        <div><div className={K}>{E2("MEDIDAS · SI LAS TIENES", "MEASUREMENTS · IF YOU HAVE THEM")}</div>
          <input aria-label={E2("Medidas", "Measurements")} value={medidas} onChange={(e) => setMedidas(e.target.value.slice(0, 60))} placeholder={E2("Ej.: baño de 5 × 8 pies", "E.g. 5 × 8 ft bathroom")}
            className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] text-[13px] font-medium outline-none" /></div>
      </div>
      <div className={`flex flex-col gap-3 p-4 ${caja}`}>
        <div className="flex items-baseline justify-between gap-2.5"><span className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Fotos", "Photos")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 6</span></div>
        <div className="text-[12px] font-medium leading-[1.5] text-ink/55">{E2("De todo el espacio y de cerca donde está el problema.", "Of the whole space and close up where the problem is.")}</div>
        <div className="flex flex-wrap gap-2.5">
          {fotos.map((f) => <span key={f.id} className="relative h-[76px] w-[76px] rounded-[13px] bg-photo-bg" style={{ backgroundImage: `url(${f.url})`, backgroundSize: "cover" }}><button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button></span>)}
          {fotos.length < 6 && <button type="button" disabled={subiendo} onClick={() => (yo ? fileRef.current?.click() : entrar())} className="box-border flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55"><Icon name="image" size={18} color="rgba(11,14,18,.5)" /><span className="text-[10.5px] font-bold">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Foto", "Photo")}</span></button>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      <div className={`flex flex-col gap-2.5 p-4 ${caja}`} role="group" aria-label={E2("¿A quién se lo mandas?", "Who do you send it to?")}>
        <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿A quién se lo mandas? · hasta 3", "Who do you send it to? · up to 3")}</div>
        {cands.map((c) => { const on = sel.includes(c.id), full = !on && n >= 3, off = !c.ok || full; return (
          <button key={c.id} type="button" role="checkbox" aria-checked={on} aria-disabled={off} onClick={() => { if (off) return; setSel(on ? sel.filter((x) => x !== c.id) : [...sel, c.id]); }}
            className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"} ${off ? "opacity-55" : ""}`}>
            <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] ${on ? "bg-ink" : "border-[1.5px] border-ink/25"}`}>{on && <Icon name="check" size={14} color="var(--tl-white)" strokeWidth={2.6} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{c.nombre}</span>
              <span className="mt-0.5 block text-[12px] font-medium text-ink/55">{!c.ok ? E2("No llega hasta tu casa", "Does not reach your home") : full ? E2("Ya elegiste 3", "You already picked 3")
                : `${E2("Visita ", "Visit ")}${c.visita ? dinero(c.visita) : E2("gratis", "free")}${c.millas != null ? ` · ${c.millas} mi` : ""}${c.dias ? E2(` · ${c.dias[0]}–${c.dias[1]} días`, ` · ${c.dias[0]}–${c.dias[1]} days`) : ""}`}</span></span>
          </button>); })}
      </div>
      <div className={`p-4 ${caja}`}>
        <div className={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</div>
        <div className="mt-3 flex flex-col gap-2.5">{como.map((t, i) => <div key={i} className="flex items-start gap-2.5"><span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
        <div className="mt-3 text-pretty text-[11.5px] font-semibold leading-[1.5] text-ink/55">{E2("Son rangos para comparar; el presupuesto por línea sale en la visita. Apruebas cada parte.", "These are ranges to compare; the line-by-line estimate comes at the visit. You approve each part.")}</div>
      </div>
      {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
    </div>
  );
  const barra = (
    <div className="flex flex-col gap-2">
      {miss.length > 0 && <div className="text-[12px] font-semibold leading-[1.45] text-ink/60"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TE FALTA · ", "STILL NEEDED · ")}</span>{miss.join(" · ")}</div>}
      <div className="grid"><Button block disabled={miss.length > 0 || ocupado} onClick={enviar}>{ocupado ? E2("Enviando…", "Sending…") : `${E2("Pedir ", "Ask ")}${n || ""}${n === 1 ? E2(" presupuesto", " for an estimate") : E2(" presupuestos", " for estimates")}`}</Button></div>
    </div>
  );
  return (
    <div data-screen-label="APP-NEG-HOGAR-PRESUPUESTOS" className="min-h-[100dvh] bg-paper pb-[170px] lg:pb-14">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${op.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Presupuesto a hasta 3", "Estimates from up to 3")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{nm(s.name).toUpperCase()}</div></div>
      </div>
      <div className="mx-auto max-w-[620px] px-4 pt-4">{cuerpo}<div className="mt-4 hidden lg:block">{barra}</div></div>
      <div data-screen-label="Presupuestos · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">{barra}</div>
      <HojaCasa v={v} />
    </div>
  );
}
