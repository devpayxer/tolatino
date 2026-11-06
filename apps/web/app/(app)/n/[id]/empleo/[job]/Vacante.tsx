"use client";
/* APP-NEG-JOB (prototipo «APP-NEG-JOB · móvil / · desktop», «Vacante · barra»): el negocio, el puesto, el pago real por
   hora, horario, días, idiomas, puestos, el trabajo, lo que piden y ofrecen, el aviso de que nunca se pide CV ni papeles,
   tu solicitud y vacantes parecidas. Aplicar pide sesión. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { VacanteDet } from "@/lib/jobs";
import { bi, diasL, haceL, horarioL, idiomasL, pagoL, tipoL } from "@/lib/jobs-txt";
import { vacGuardar } from "../../acciones-jobs";
import { TAG_APP } from "../../Jobs";

type N = "Icon" | "Button" | "Chip" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";

export function Vacante({ v, negocio, sesion, es }: { v: VacanteDet; negocio: string; sesion: boolean; es: boolean }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const [sv, setSv] = useState(v.saved);
  const title = bi(v.title, es), app = v.app, vivo = !!app && app.status !== "withdrawn", tg = app ? TAG_APP(es, app.ivOk)[app.status] : null;
  const volver = () => router.push(`/n/${negocio}?tab=jobs`);
  const guardar = async () => {
    if (!sesion) return router.push(`/entrar?volver=${encodeURIComponent(`/n/${negocio}/empleo/${v.id}`)}`);
    setSv(!sv); const r = await vacGuardar(v.id).catch(() => null); if (!r?.ok) setSv(sv);
  };
  const aplicar = () => vivo ? router.push(`/solicitud/${app!.number}`) : router.push(sesion ? `/n/${negocio}/empleo/${v.id}/aplicar` : `/entrar?volver=${encodeURIComponent(`/n/${negocio}/empleo/${v.id}/aplicar`)}`);
  const compartir = () => { const u = location.href; if (navigator.share) navigator.share({ title, url: u }).catch(() => undefined); else navigator.clipboard?.writeText(u).catch(() => undefined); };
  const cuando = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
  const meta = `${tipoL(v.kind, es)} · ${haceL(v.ago, es)}`.toUpperCase();

  const solicitud = app && tg && (
    <button type="button" onClick={() => router.push(`/solicitud/${app.number}`)} className="flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-ink bg-white px-4 py-3.5 text-left">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className={K}>{E2("TU SOLICITUD", "YOUR APPLICATION")}</span><Tag tone={tg[1]}>{tg[0]}</Tag></div>
        <div className="mt-[7px] text-[12.5px] font-medium leading-[1.45] text-ink/60">{E2(`Enviada el ${cuando(app.at)} · ver estado`, `Sent ${cuando(app.at)} · see status`)}</div>
      </div>
      <Icon name="chevronRight" size={16} color="rgba(11,14,18,.35)" />
    </button>
  );
  const principal = (
    <div className={caja}>
      <div className="flex items-center gap-[11px]">
        <span className="size-[42px] flex-none rounded-xl bg-photo-bg bg-cover bg-center" style={v.logo ? { backgroundImage: `url(${v.logo})` } : {}} />
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{v.bname}</div><div className="mt-[3px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{[v.subs, v.ciudad].filter(Boolean).join(" · ").toUpperCase()}</div></div>
      </div>
      <div className="mt-3.5 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em]">{title}</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[24px] font-extrabold leading-none tracking-[-0.03em]">{pagoL(v.payFrom, v.payTo, es)}</span>
        {v.tips && <Chip variant="slot">{E2("+ PROPINAS", "+ TIPS")}</Chip>}
      </div>
      <div className="mt-1 text-[12px] font-medium text-ink/55">{E2("Por hora, antes de impuestos.", "Per hour, before taxes.")}</div>
      <div className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-3 border-t border-ink/[.07] pt-4">
        {([["clock", E2("HORARIO", "HOURS"), horarioL(v.start, v.end)], ["calendar", E2("DÍAS", "DAYS"), diasL(v.days, es)], ["language", E2("IDIOMAS", "LANGUAGES"), idiomasL(v.langEs, v.langEn, es)],
          ["users", E2("PUESTOS", "OPENINGS"), `${v.openings} ${v.openings > 1 ? E2("personas", "people") : E2("persona", "person")}`]] as [string, string, string][]).map(([ic, k, val]) => (
          <div key={k} className="flex min-w-0 items-start gap-[9px]">
            <span className="grid flex-none pt-px"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /></span>
            <div className="min-w-0"><div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{k}</div><div className="mt-1 text-pretty text-[13px] font-bold leading-[1.35]">{val}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
  const trabajo = bi(v.descr, es) && <div className={caja}><div className={K}>{E2("EL TRABAJO", "THE JOB")}</div><div className="mt-[9px] text-pretty text-[14px] font-medium leading-[1.6] text-ink/80">{bi(v.descr, es)}</div></div>;
  const piden = (v.req.length > 0 || v.ben.length > 0) && (
    <div className={`${caja} flex flex-col gap-4`}>
      {v.req.length > 0 && <div><div className={K}>{E2("NECESITAS", "YOU NEED")}</div><div className="mt-2.5 flex flex-col gap-2">{v.req.map((q, i) => <div key={i} className="flex items-center gap-[9px]"><Icon name="check" size={15} color="var(--tl-ink)" /><span className="text-[13px] font-medium leading-[1.45]">{es ? q[0] : q[1] || q[0]}</span></div>)}</div></div>}
      {v.ben.length > 0 && <div><div className={K}>{E2("TE OFRECEN", "THEY OFFER")}</div><div className="mt-2.5 flex flex-col gap-2">{v.ben.map((q, i) => <div key={i} className="flex items-center gap-[9px]"><Icon name="star" size={15} color="var(--tl-pro)" /><span className="text-[13px] font-medium leading-[1.45]">{es ? q[0] : q[1] || q[0]}</span></div>)}</div></div>}
    </div>
  );
  const seguro = (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-[rgba(0,229,196,.12)] px-3.5 py-3">
      <span className="grid flex-none pt-px"><Icon name="shield" size={16} color="var(--tl-open-text)" /></span>
      <span className="text-pretty text-[12.5px] font-medium leading-[1.55] text-open-text">{E2("Para aplicar no se pide CV, estatus migratorio, SSN ni ningún pago. Si alguien te lo pide, repórtalo.", "Applying never asks for a resume, immigration status, SSN or any fee. If anyone asks, report it.")}</span>
    </div>
  );
  const sim = v.sim.length > 0 && (
    <div className={caja}>
      <div className={K}>{E2(`VACANTES PARECIDAS EN ${v.ciudad.toUpperCase()}`, `SIMILAR JOBS IN ${v.ciudad.toUpperCase()}`)}</div>
      <div className="mt-1.5">
        {v.sim.map((x) => (
          <button key={x.id} type="button" onClick={() => router.push(`/n/${x.biz}/empleo/${x.id}`)} className="flex w-full items-center gap-3 border-t border-ink/[.07] py-[11px] text-left">
            <span className="size-11 flex-none rounded-xl bg-photo-bg bg-cover bg-center" style={x.logo ? { backgroundImage: `url(${x.logo})` } : {}} />
            <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.3]">{bi(x.title, es)}</div><div className="mt-[3px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{`${x.bname} · ${tipoL(x.kind, es)}`.toUpperCase()}</div></div>
            <span className="flex-none font-display text-[13px] font-extrabold">{pagoL(x.payFrom, x.payTo, es)}</span>
          </button>
        ))}
      </div>
    </div>
  );
  const boton = <Button variant="primary" block onClick={aplicar}>{vivo ? E2("Ver mi solicitud", "See my application") : E2("Aplicar", "Apply")}</Button>;
  const corazon = (
    <button type="button" aria-label={sv ? E2("Quitar de guardadas", "Unsave") : E2("Guardar", "Save")} aria-pressed={sv} onClick={guardar} className="box-border grid size-[50px] flex-none place-items-center rounded-[15px] border-[1.5px] border-ink/[.14] bg-white">
      <Icon name="heart" size={18} color={sv ? "var(--tl-danger)" : "var(--tl-ink)"} />
    </button>
  );
  return (
    <div data-pantalla="APP-NEG-JOB" className="min-h-dvh bg-paper pb-[120px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-JOB · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{title}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
          <button type="button" aria-label={E2("Compartir", "Share")} onClick={compartir} className="grid size-[38px] flex-none place-items-center rounded-[13px]"><Icon name="share" size={17} /></button>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{solicitud}{principal}{trabajo}{piden}{seguro}{sim}</div>
        <div data-screen-label="Vacante · barra" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]">
          {corazon}<div className="flex min-w-0 flex-1">{boton}</div>
        </div>
      </div>
      <div data-screen-label="APP-NEG-JOB · desktop" className="mx-auto hidden max-w-[1080px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{v.bname}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{meta}</div>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.04em]">{title}</h1>
        <div className="mt-[18px] grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{principal}{trabajo}{piden}{sim}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">
            {solicitud}{seguro}
            <div className="flex items-center gap-2.5">{corazon}<div className="flex min-w-0 flex-1">{boton}</div></div>
            {!vivo && <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{E2("SIN CV · TOMA 1 MINUTO", "NO RESUME · TAKES 1 MINUTE")}</div>}
            <button type="button" onClick={compartir} className="inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-action"><Icon name="share" size={15} />{E2("Compartir", "Share")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
