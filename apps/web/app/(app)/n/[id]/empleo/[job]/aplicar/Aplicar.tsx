"use client";
/* APP-NEG-JOB-APLICAR (prototipo «APP-NEG-JOB-APLICAR · móvil / · desktop», «Aplicar · barra»): nombre, teléfono,
   experiencia, nota opcional, días que puedes (marcados los del puesto), idiomas y confirmar requisitos. Sin CV, sin
   estatus migratorio ni SSN. El servidor revisa todo y da el número de solicitud. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { VacanteDet } from "@/lib/jobs";
import { bi, DCORTO, diasL, EXP_L, horarioL, pagoL } from "@/lib/jobs-txt";
import { vacAplicar } from "../../../acciones-jobs";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const campo = "flex h-12 items-center rounded-[13px] border border-ink/[.12] bg-white px-3.5";
const inp = "min-w-0 flex-1 border-none bg-transparent text-[14px] font-semibold text-ink outline-none";
const telL = (p: string) => { const d = p.replace(/\D/g, "").slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };

export function Aplicar({ v, negocio, nombre, tel, es }: { v: VacanteDet; negocio: string; nombre: string; tel: string; es: boolean }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const [name, setName] = useState(nombre), [phone, setPhone] = useState(telL(tel)), [exp, setExp] = useState<number | null>(null), [note, setNote] = useState("");
  const [days, setDays] = useState<number[]>([]), [langs, setLangs] = useState<string[]>(["es"]), [reqs, setReqs] = useState<boolean[]>(v.req.map(() => false));
  const [enviando, setEnviando] = useState(false), [error, setError] = useState("");
  const title = bi(v.title, es), pay = `${pagoL(v.payFrom, v.payTo, es)}${v.tips ? E2(" + propinas", " + tips") : ""}`, meta = `${v.bname} · ${title}`.toUpperCase();
  const ph = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""), reqOk = reqs.every(Boolean), fit = days.length > 0 && v.days.every((d) => days.includes(d));
  const miss = !name.trim() ? E2("TU NOMBRE", "YOUR NAME") : ph.length < 10 ? E2("TU TELÉFONO", "YOUR PHONE") : exp == null ? E2("TU EXPERIENCIA", "YOUR EXPERIENCE")
    : !days.length ? E2("LOS DÍAS QUE PUEDES", "THE DAYS YOU CAN WORK") : !reqOk ? E2("CONFIRMAR LOS REQUISITOS", "CONFIRM THE REQUIREMENTS") : "";
  const volver = () => router.push(`/n/${negocio}/empleo/${v.id}`);
  const enviar = async () => {
    if (miss || enviando) return;
    setEnviando(true); setError("");
    const r = await vacAplicar(negocio, { job: v.id, name: name.trim(), phone: ph, exp: exp!, note: note.trim(), days, langs, reqs: reqOk }).catch(() => null);
    if (r?.ok && r.numero) { router.push(`/solicitud/${r.numero}?ok=1`); return; }
    setEnviando(false);
    if (r && !r.ok && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${negocio}/empleo/${v.id}/aplicar`)}`); return; }
    setError(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo enviar. Revisa tu conexión.", "Could not send. Check your connection."));
  };
  const tog = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const EX = EXP_L(es), DL = DCORTO(es);

  const fallo = error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>;
  const puesto = <div className={caja}><div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{title}</div><div className="mt-1 text-[12.5px] font-medium text-ink/60">{v.bname} · {pay}</div></div>;
  const datos = (
    <div className={`${caja} flex flex-col gap-2.5`}>
      <div className={K}>{E2("TUS DATOS", "YOUR DETAILS")}</div>
      <label className={campo}><span className="sr-only">{E2("Nombre y apellido", "Full name")}</span><input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder={E2("Nombre y apellido", "Full name")} autoComplete="name" className={inp} /></label>
      <label className={campo}><span className="sr-only">{E2("Teléfono", "Phone")}</span><input value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} placeholder={E2("Teléfono", "Phone")} inputMode="tel" autoComplete="tel" className={inp} /></label>
    </div>
  );
  const experiencia = (
    <div className={caja}>
      <div className={K}>{E2("EXPERIENCIA EN ESTO", "EXPERIENCE IN THIS")}</div>
      <div role="radiogroup" aria-label={E2("Experiencia", "Experience")} className="mt-[11px] flex flex-wrap gap-[7px]">
        {([0, 1, 3, 4] as const).map((k) => <Chip key={k} variant={exp === k ? "selected" : "filter"} role="radio" aria-checked={exp === k} onClick={() => setExp(k)}>{EX[k]}</Chip>)}
      </div>
      <div className="mt-3.5 flex justify-between gap-2.5"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("CUÉNTALES (OPCIONAL)", "TELL THEM (OPTIONAL)")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{note.length}/200</span></div>
      <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={3} aria-label={E2("Cuéntales (opcional)", "Tell them (optional)")} placeholder={E2("Dónde has trabajado, qué sabes hacer…", "Where you have worked, what you can do…")}
        className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] text-ink outline-none" />
    </div>
  );
  const dias = (
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("DÍAS QUE PUEDES", "DAYS YOU CAN WORK")}</span>{fit && <span className="font-mono text-[10px] font-bold tracking-[0.06em] text-open-text">{E2("PUEDES TODOS LOS DÍAS", "YOU CAN WORK ALL DAYS")}</span>}</div>
      <div className="mt-[11px] grid grid-cols-7 gap-1.5">
        {DL.map((l, d) => {
          const on = days.includes(d), nd = v.days.includes(d);
          return <button key={d} type="button" aria-pressed={on} onClick={() => setDays((x) => tog(x, d))}
            className={`rounded-xl border py-2.5 text-center font-mono text-[11px] font-bold ${on ? "border-ink bg-ink text-white" : nd ? "border-[rgba(75,55,245,.3)] bg-[rgba(75,55,245,.08)] text-action" : "border-ink/[.12] bg-white text-ink/50"}`}>{l}</button>;
        })}
      </div>
      <div className="mt-2 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2(`Este puesto: ${diasL(v.days, es).toLowerCase()}, ${horarioL(v.start, v.end)}.`, `This job: ${diasL(v.days, es)}, ${horarioL(v.start, v.end)}.`)}</div>
    </div>
  );
  const idiomas = (
    <div className={caja}>
      <div className={K}>{E2("IDIOMAS QUE HABLAS", "LANGUAGES YOU SPEAK")}</div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {([["es", E2("Español", "Spanish")], ["en", E2("Inglés", "English")]] as const).map(([k, l]) => <Chip key={k} variant={langs.includes(k) ? "selected" : "filter"} aria-pressed={langs.includes(k)} onClick={() => setLangs((x) => tog(x, k))}>{l}</Chip>)}
      </div>
      {v.req.length > 0 && <>
        <div className={`${K} mt-4`}>{E2("CONFIRMA QUE CUMPLES", "CONFIRM YOU MEET")}</div>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {v.req.map((q, i) => (
            <button key={i} type="button" role="checkbox" aria-checked={reqs[i]} onClick={() => setReqs((x) => x.map((y, j) => (j === i ? !y : y)))} className="flex items-center gap-2.5 text-left">
              <span className={`box-border grid size-5 flex-none place-items-center rounded-md border-[1.5px] ${reqs[i] ? "border-ink bg-ink" : "border-ink/25 bg-white"}`}>{reqs[i] && <Icon name="check" size={12} color="var(--tl-white)" strokeWidth={2.8} />}</span>
              <span className="text-[13px] font-semibold">{es ? q[0] : q[1] || q[0]}</span>
            </button>
          ))}
        </div>
      </>}
    </div>
  );
  const priv = (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-ink/[.04] px-3.5 py-3">
      <span className="grid flex-none pt-px"><Icon name="lock" size={15} color="rgba(11,14,18,.6)" /></span>
      <span className="text-pretty text-[12px] font-medium leading-[1.55] text-ink/[.68]">{E2(`Tu teléfono solo lo ve ${v.bname}. No se pide CV, estatus migratorio ni SSN.`, `Only ${v.bname} sees your phone. No resume, immigration status or SSN.`)}</span>
    </div>
  );
  const boton = <Button variant="primary" block disabled={!!miss || enviando} onClick={enviar}>{E2("Enviar solicitud", "Send application")}</Button>;
  const nota = <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{miss ? `${E2("FALTA: ", "MISSING: ")}${miss}` : E2("LO VES EN TU SOLICITUD CUANDO RESPONDAN", "YOU SEE IT IN YOUR APPLICATION WHEN THEY REPLY")}</div>;
  const sum: [string, string][] = [[E2("PUESTO", "JOB"), title], [E2("PAGO", "PAY"), pay], [E2("DÍAS", "DAYS"), diasL(v.days, es)], [E2("HORARIO", "HOURS"), horarioL(v.start, v.end)],
    [E2("TUS DÍAS", "YOUR DAYS"), days.length ? [...days].sort((a, b) => a - b).map((d) => DL[d]).join(" · ") : "—"]];
  const cuerpo = <>{fallo}{puesto}{datos}{experiencia}{dias}{idiomas}{priv}</>;

  return (
    <div data-pantalla="APP-NEG-JOB-APLICAR" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-JOB-APLICAR · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Aplicar", "Apply")}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{cuerpo}</div>
        <div data-screen-label="Aplicar · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex">{boton}</div><div className="mt-[9px]">{nota}</div>
        </div>
      </div>
      <div data-screen-label="APP-NEG-JOB-APLICAR · desktop" className="mx-auto hidden max-w-[1080px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{title}</button>
        <h1 className="mt-3.5 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Aplicar", "Apply")}</h1>
        <div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div>
        <div className="mt-6 grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{cuerpo}</div>
          <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white p-5 shadow-float min-[1100px]:sticky min-[1100px]:top-[96px]">
            <div className={K}>{E2("RESUMEN", "SUMMARY")}</div>
            {sum.map(([k, val]) => <div key={k} className="flex justify-between gap-3 text-[12.5px] font-medium"><span className="text-ink/55">{k}</span><span className="text-right font-bold">{val}</span></div>)}
            <div className="flex">{boton}</div>{nota}
          </div>
        </div>
      </div>
    </div>
  );
}
