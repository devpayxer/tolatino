"use client";
/* APP-NEG-JOB-ESTADO (prototipo «APP-NEG-JOB-ESTADO · móvil / · desktop»): en qué va la solicitud (enviada, vista,
   respuesta), la propuesta de entrevista para confirmar o llamar, lo que mandaste, retirar y, si no se dio, vacantes
   parecidas. Se actualiza sola mientras sigue abierta. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { MiSolicitud } from "@/lib/jobs";
import { bi, DCORTO, EXP_L, pagoL, tipoL } from "@/lib/jobs-txt";
import { vacConfirmar, vacRetirar } from "../../n/[id]/acciones-jobs";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";

export function Solicitud({ a, es, enviada }: { a: MiSolicitud; es: boolean; enviada: boolean }) {
  const router = useRouter();
  const E2 = (x: string, y: string) => (es ? x : y);
  const [flash, setFlash] = useState(enviada && a.status === "sent" ? E2("Solicitud enviada", "Application sent") : "");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [seguro, setSeguro] = useState(false);
  const st = a.status, abierta = st === "sent" || st === "seen" || st === "contact" || st === "interview", title = bi(a.title, es);
  useEffect(() => { if (!abierta) return; const t = setInterval(() => router.refresh(), 20000); return () => clearInterval(t); }, [abierta, router]);
  const loc = es ? "es-US" : "en-US";
  const hora = (iso: string | null) => (iso ? new Intl.DateTimeFormat(loc, { timeZone: a.tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "");
  const ivL = a.iv ? (() => { const d = new Date(a.iv); const f = new Intl.DateTimeFormat(loc, { timeZone: a.tz, weekday: "long", day: "numeric", month: "short" }).format(d).replace(/\./g, ""); const h = new Intl.DateTimeFormat(loc, { timeZone: a.tz, hour: "numeric", minute: "2-digit" }).format(d); return `${f.charAt(0).toUpperCase()}${f.slice(1)} · ${h}`; })() : "";
  const ivPaso = !!a.iv && new Date(a.iv).getTime() < Date.now();
  const H: Record<string, [string, string, string, string, string, string]> = {
    sent: ["clock", "rgba(75,55,245,.1)", "var(--tl-action)", E2("ENVIADA", "SENT"), E2(`Tu solicitud llegó a ${a.bname}`, `Your application reached ${a.bname}`), E2("Cuando respondan, lo ves aquí.", "When they reply, you will see it here.")],
    seen: ["clock", "rgba(75,55,245,.1)", "var(--tl-action)", E2("VISTA", "SEEN"), E2(`${a.bname} vio tu solicitud`, `${a.bname} saw your application`), E2("Todavía no deciden. Cuando respondan, lo ves aquí.", "No decision yet. When they reply, you will see it here.")],
    contact: ["phone", "rgba(0,229,196,.16)", "var(--tl-open-text)", E2("TE VAN A LLAMAR", "THEY WILL CALL"), E2(`${a.bname} quiere hablar contigo`, `${a.bname} wants to talk to you`), E2(`Te llaman al ${a.phone} en los próximos días.`, `They will call ${a.phone} in the next few days.`)],
    interview: ["calendar", "rgba(0,229,196,.16)", "var(--tl-open-text)", E2("ENTREVISTA", "INTERVIEW"), a.ivOk ? E2("Entrevista confirmada", "Interview confirmed") : E2("Te invitan a una entrevista", "You are invited to an interview"),
      ivPaso ? E2(`Fue el ${ivL}. ${a.bname} te dirá cómo les fue.`, `It was ${ivL}. ${a.bname} will let you know.`) : a.ivOk ? E2(`${ivL} en el local. Si no puedes ir, llama al negocio.`, `${ivL} at the business. If you cannot make it, call them.`) : E2(`Te proponen el ${ivL}. Confirma la hora o llama si necesitas otra.`, `They propose ${ivL}. Confirm the time or call if you need another.`)],
    not_selected: ["close", "rgba(192,57,43,.1)", "var(--tl-danger)", E2("NO SELECCIONADO", "NOT SELECTED"), E2(`${a.bname} eligió a otra persona`, `${a.bname} chose someone else`), a.sim.length ? E2("Gracias por aplicar. Abajo tienes vacantes parecidas.", "Thanks for applying. Similar jobs are below.") : E2("Gracias por aplicar.", "Thanks for applying.")],
    withdrawn: ["close", "rgba(11,14,18,.06)", "rgba(11,14,18,.6)", E2("RETIRADA", "WITHDRAWN"), E2("Retiraste tu solicitud", "You withdrew your application"), E2(`${a.bname} ya no la ve.`, `${a.bname} no longer sees it.`)],
  };
  const h = H[st]!;
  const endL = ({ contact: E2("Te van a llamar", "They will call you"), interview: E2("Entrevista", "Interview"), not_selected: E2("No seleccionado", "Not selected"), withdrawn: E2("Retirada", "Withdrawn") } as Record<string, string>)[st] ?? E2("Respuesta del negocio", "Business reply");
  const lvl = st === "sent" ? 0 : st === "seen" ? 1 : 2;
  const SS: [string, string][] = [[E2("Enviada", "Sent"), hora(a.sent)], [E2("Vista", "Seen"), hora(a.seen)], [endL, hora(a.fin)]];
  const EX = EXP_L(es), DL = DCORTO(es);
  const rows: [string, string][] = [[E2("NOMBRE", "NAME"), a.name], [E2("TELÉFONO", "PHONE"), a.phone], [E2("EXPERIENCIA", "EXPERIENCE"), EX[a.exp] ?? "—"], [E2("DÍAS", "DAYS"), a.days.map((d) => DL[d]).join(" · ")],
    [E2("IDIOMAS", "LANGUAGES"), a.langs.map((k) => (k === "es" ? E2("Español", "Spanish") : E2("Inglés", "English"))).join(" · ") || "—"], ...(a.note ? [[E2("NOTA", "NOTE"), a.note] as [string, string]] : [])];
  const num = `${E2("Solicitud ", "Application ")}${a.number} · ${title}`.toUpperCase();
  const volver = () => router.push(`/n/${a.biz}/empleo/${a.job}`);
  const correr = async (f: () => Promise<{ ok: boolean; msg?: { es: string; en: string } } | null>, ok: string) => {
    if (busy) return;
    setBusy(true); setError("");
    const r = await f().catch(() => null);
    setBusy(false);
    if (r?.ok) { setFlash(ok); setSeguro(false); router.refresh(); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
    router.refresh();
  };
  const llamar = a.btel ? () => { location.href = `tel:${a.btel}`; } : null;

  const cuerpo = (desk: boolean) => (
    <>
      {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
      {error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
      <div className={`rounded-[22px] border border-ink/[.08] bg-white ${desk ? "p-[26px]" : "p-5"}`}>
        <div className="flex items-start gap-3.5">
          <span className="grid size-[46px] flex-none place-items-center rounded-[15px]" style={{ background: h[1] }}><Icon name={h[0]} size={22} color={h[2]} /></span>
          <div className="min-w-0 flex-1">
            <div className={K}>{h[3]}</div>
            <div className={`mt-[7px] text-pretty font-display font-extrabold leading-[1.1] tracking-[-0.04em] ${desk ? "text-[28px]" : "text-[23px]"}`}>{h[4]}</div>
            <div className="mt-[7px] text-pretty text-[13.5px] font-medium leading-[1.5] text-ink/[.62]">{h[5]}</div>
          </div>
        </div>
      </div>
      {st === "interview" && !a.ivOk && !ivPaso && (
        <div className="rounded-[18px] border-[1.5px] border-ink bg-white p-4">
          <div className={K}>{E2("PROPUESTA DE ENTREVISTA", "INTERVIEW PROPOSAL")}</div>
          <div className="mt-[9px] font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em]">{ivL}</div>
          <div className="mt-1 text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`En el local de ${a.bname}`, `At ${a.bname}`)}</div>
          <div className="mt-3 flex gap-2">
            <div className="grid flex-1"><Button variant="primary" size="md" disabled={busy} onClick={() => correr(() => vacConfirmar(a.number), E2("Confirmaste la entrevista", "You confirmed the interview"))}>{E2("Confirmar", "Confirm")}</Button></div>
            {llamar && <div className="grid flex-1"><Button variant="secondary" size="md" icon="phone" onClick={llamar}>{E2("Llamar", "Call")}</Button></div>}
          </div>
        </div>
      )}
      <div className="rounded-[18px] border border-ink/[.08] bg-white px-[18px] py-4">
        {SS.map(([l, tm], i) => {
          const done = i < lvl || (i === 2 && lvl === 2), cur = i === lvl && !done;
          return (
            <div key={i} className="flex gap-[13px]">
              <div className="flex w-4 flex-none flex-col items-center">
                <span className="box-border size-4 rounded-full border-[2.5px]" style={{ background: done ? "var(--tl-ink)" : "var(--tl-white)", borderColor: done ? "var(--tl-ink)" : cur ? "var(--tl-action)" : "rgba(11,14,18,.18)" }} />
                {i < 2 && <span className="min-h-[22px] w-0.5 flex-1" style={{ background: i < lvl ? "rgba(11,14,18,.8)" : "rgba(11,14,18,.12)" }} />}
              </div>
              <div className="flex min-w-0 flex-1 justify-between gap-2.5 pb-3.5">
                <span className={`text-[13.5px] leading-[1.2] ${i <= lvl ? "font-extrabold text-ink" : "font-semibold text-ink/45"}`}>{l}</span>
                <span className="flex-none font-mono text-[11px] font-bold text-ink/50">{i <= lvl ? tm : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
        <div className={K}>{E2("LO QUE ENVIASTE", "WHAT YOU SENT")}</div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3.5 gap-y-3">
          {rows.map(([k, v]) => <div key={k} className="min-w-0"><div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{k}</div><div className="mt-[5px] text-pretty break-words text-[13px] font-semibold leading-[1.4]">{v}</div></div>)}
        </div>
      </div>
      {a.sim.length > 0 && (
        <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
          <div className={K}>{E2("VACANTES PARECIDAS", "SIMILAR JOBS")}</div>
          <div className="mt-1.5">
            {a.sim.map((x) => (
              <button key={x.id} type="button" onClick={() => router.push(`/n/${x.biz}/empleo/${x.id}`)} className="flex w-full items-center gap-3 border-t border-ink/[.07] py-[11px] text-left">
                <span className="size-11 flex-none rounded-xl bg-photo-bg bg-cover bg-center" style={x.logo ? { backgroundImage: `url(${x.logo})` } : {}} />
                <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.3]">{bi(x.title, es)}</div><div className="mt-[3px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{`${x.bname} · ${tipoL(x.kind, es)}`.toUpperCase()}</div></div>
                <span className="flex-none font-display text-[13px] font-extrabold">{pagoL(x.payFrom, x.payTo, es)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {abierta && (seguro
          ? <div className="flex flex-col gap-2 rounded-[18px] border border-ink/[.08] bg-white p-4">
              <div className="text-[13.5px] font-bold">{E2("¿Retirar tu solicitud?", "Withdraw your application?")}</div>
              <div className="text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`${a.bname} ya no la verá. Puedes volver a aplicar mientras la vacante siga abierta.`, `${a.bname} will no longer see it. You can apply again while the job is open.`)}</div>
              <div className="mt-1 flex gap-2"><div className="grid flex-1"><Button variant="secondary" size="md" onClick={() => setSeguro(false)}>{E2("No", "No")}</Button></div><div className="grid flex-1"><Button variant="danger" size="md" disabled={busy} onClick={() => correr(() => vacRetirar(a.number), E2("Retiraste tu solicitud", "You withdrew your application"))}>{E2("Retirar", "Withdraw")}</Button></div></div>
            </div>
          : <div className="flex justify-center"><button type="button" onClick={() => setSeguro(true)} className="text-[13px] font-bold text-danger">{E2("Retirar solicitud", "Withdraw application")}</button></div>)}
        <div className="flex"><Button variant="secondary" block onClick={volver}>{E2("Volver a la vacante", "Back to the job")}</Button></div>
      </div>
    </>
  );
  return (
    <div data-pantalla="APP-NEG-JOB-ESTADO" className="min-h-dvh bg-paper pb-10 lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-JOB-ESTADO · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{a.bname}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{num}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{cuerpo(false)}</div>
      </div>
      <div data-screen-label="APP-NEG-JOB-ESTADO · desktop" className="hidden lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Volver a la vacante", "Back to the job")}</button>
        <div className="mx-auto mt-4 flex max-w-[720px] flex-col gap-3.5">
          <div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{num}</div>
          {cuerpo(true)}
        </div>
      </div>
    </div>
  );
}
