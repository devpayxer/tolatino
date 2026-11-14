"use client";
/* APP-NEG-RESENA-ESTADO (prototipo «APP-NEG-RESENA-ESTADO · móvil / · desktop», revSVals): cómo va tu reseña (publicada,
   el negocio respondió, el negocio pidió revisarla, revisada), así la ven los vecinos, los pasos con su hora, hasta cuándo
   se edita, Editar y Borrar. Todo sale del servidor; la respuesta del negocio solo se ve si el negocio es Pro. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { MiResena } from "@/lib/resenas";
import { quitarMiResena } from "../../acciones-resena";
import { propsTarjeta } from "../../Resenas";

type N = "Icon" | "Button" | "ReviewCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, ReviewCard } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";

export function Tuya({ m, es, nombre, flash }: { m: MiResena; es: boolean; nombre: string; flash: 0 | 1 | 2 }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const b = m.negocio, c = m.card;
  const [borrar, setBorrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loc = es ? "es-US" : "en-US";
  // La hora como en el resto de la app: «12:31 PM» (en los dos idiomas).
  const hm = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: m.tz }).format(new Date(iso)) : "");
  const hasta = (() => {
    const d = new Date(m.hasta), dia = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short", timeZone: m.tz }).formatToParts(d);
    const g = (t: string) => dia.find((p) => p.type === t)?.value ?? "";
    const w = g("weekday").replace(".", ""), mo = g("month").replace(".", "");
    return es ? `${w.charAt(0).toUpperCase()}${w.slice(1)} ${g("day")} ${mo} · ${hm(m.hasta)}` : `${w} ${mo} ${g("day")} · ${hm(m.hasta)}`;
  })();
  const ficha = () => router.push(`/n/${b.id}${m.pro ? "?tab=rev" : ""}`);

  // Estado (revSVals · H): publicada, respondió, en revisión, revisada; y oculta por To'Latino con su motivo.
  const st = m.oculta ? "hid" : m.estado ?? (m.pro && c.reply ? "rep" : "pub");
  const H: Record<string, [string, string, string, string, string, string]> = {
    pub: ["star", "rgba(255,176,32,.16)", "var(--tl-pro-ink)", E2("RESEÑA PUBLICADA", "REVIEW POSTED"), E2(`Gracias, ${nombre}`, `Thank you, ${nombre}`),
      E2(`Ya la ven los vecinos en la página de ${b.name}.`, `Neighbors can already see it on ${b.name}’s page.`) + (c.src !== "vis" ? E2(" Sale como verificada porque pediste por To'Latino.", " It shows as verified because you ordered on To'Latino.") : "")],
    rep: c.reply?.offer
      ? ["chat", "rgba(0,229,196,.16)", "var(--tl-open-text)", E2("EL NEGOCIO RESPONDIÓ", "THE BUSINESS REPLIED"), E2(`${b.name} quiere arreglarlo`, `${b.name} wants to make it right`), E2("Te propone una solución. Si te convence, puedes actualizar tu reseña; no es obligatorio.", "They offer a fix. If it works for you, you can update your review; you do not have to.")]
      : ["chat", "rgba(0,229,196,.16)", "var(--tl-open-text)", E2("EL NEGOCIO RESPONDIÓ", "THE BUSINESS REPLIED"), E2(`${b.name} respondió tu reseña`, `${b.name} replied to your review`), E2("Su respuesta aparece debajo de tu reseña, a la vista de todos.", "Their reply shows under your review, for everyone to see.")],
    disp: ["shield", "rgba(11,14,18,.06)", "var(--tl-ink)", E2("EN REVISIÓN", "IN REVIEW"), E2(`${b.name} pidió revisar tu reseña`, `${b.name} asked to review your post`), E2("Sigue publicada mientras To'Latino la revisa, hasta 48 h. Solo se quita si rompe las reglas.", "It stays posted while To'Latino reviews it, up to 48 h. It is only removed if it breaks the rules.")],
    kept: ["shield", "rgba(0,229,196,.16)", "var(--tl-open-text)", E2("REVISADA", "REVIEWED"), E2("Tu reseña cumple las reglas", "Your review meets the rules"), E2("Sigue publicada. Un negocio no puede quitar una reseña porque no le guste.", "It stays posted. A business cannot remove a review just because it does not like it.")],
    hid: ["ban", "var(--tl-danger-tint)", "var(--tl-danger)", E2("OCULTA", "HIDDEN"), E2("To'Latino ocultó tu reseña", "To'Latino hid your review"), m.motivo ? E2(`Motivo: ${m.motivo}`, `Reason: ${m.motivo}`) : E2("Rompía las reglas de las reseñas.", "It broke the review rules.")],
  };
  const h = H[st] ?? H.pub!;
  type Paso = { l: string; tm: string; done: boolean };
  const pasos: Paso[] = [{ l: E2("Publicada", "Posted"), tm: hm(m.t.pub), done: true }, { l: E2(`${b.name} recibió el aviso`, `${b.name} was notified`), tm: hm(m.t.pub), done: true }];
  if (!m.pro) pasos.push({ l: E2("Este negocio no responde reseñas en To'Latino", "This business does not reply to reviews on To'Latino"), tm: "", done: false });
  else if (m.estado) pasos.push({ l: E2("El negocio pidió revisarla", "The business asked for a review"), tm: hm(m.t.disp), done: true },
    m.estado === "kept" ? { l: E2("To'Latino la revisó · sigue publicada", "To'Latino reviewed it · still posted"), tm: hm(m.t.disp), done: true } : { l: E2("To'Latino la revisa · hasta 48 h", "To'Latino is reviewing · up to 48 h"), tm: "", done: false });
  else pasos.push(c.reply ? { l: E2("Respuesta del negocio", "Business reply"), tm: hm(m.t.rep), done: true } : { l: E2("Respuesta del negocio · suele llegar en 1 día", "Business reply · usually within 1 day"), tm: "", done: false });

  const quitar = async () => {
    if (ocupado) return;
    setOcupado(true); setError(null);
    const r = await quitarMiResena(b.id).catch(() => ({ ok: false as const, msg: { es: "No se pudo borrar. Revisa tu conexión.", en: "Could not delete. Check your connection." } }));
    if (r.ok) { router.push(`/n/${b.id}`); router.refresh(); return; }
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
  };

  const aviso = flash > 0 && (
    <div className="flex items-center gap-[9px] rounded-[14px] bg-[rgba(0,229,196,.16)] px-3.5 py-[11px]">
      <Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} />
      <span className="text-[12.5px] font-bold text-open-text">{flash === 2 ? E2("Listo: actualizamos tu reseña.", "Done: your review was updated.") : E2("Listo: tu reseña está publicada.", "Done: your review is posted.")}</span>
    </div>
  );
  const principal = (desk: boolean) => (
    <div className={`border border-ink/[.08] bg-white ${desk ? "rounded-[22px] p-[26px]" : "rounded-[22px] p-5"}`}>
      <div className="flex items-start gap-3.5">
        <span className="grid size-[46px] flex-none place-items-center rounded-[15px]" style={{ background: h[1] }}><Icon name={h[0]} size={22} color={h[2]} /></span>
        <div className="min-w-0 flex-1">
          <div className={K}>{h[3]}</div>
          <div className={`mt-[7px] text-pretty font-display font-extrabold leading-[1.1] tracking-[-0.04em] ${desk ? "text-[28px]" : "text-[23px]"}`}>{h[4]}</div>
          <div className="mt-[7px] text-pretty text-[13.5px] font-medium leading-[1.5] text-ink/[.62]">{h[5]}</div>
        </div>
      </div>
    </div>
  );
  const asi = (
    <>
      <div className={`mt-1 ${K}`}>{E2("ASÍ LA VEN LOS VECINOS", "HOW NEIGHBORS SEE IT")}</div>
      <ReviewCard {...propsTarjeta({ ...c, d: c.d }, { es, negocio: b.name, preview: true })} />
    </>
  );
  const estado = (
    <div className="rounded-[18px] border border-ink/[.08] bg-white px-[18px] py-4">
      <div className={`mb-3 ${K}`}>{E2("ESTADO", "STATUS")}</div>
      {pasos.map((s, i) => (
        <div key={i} className="flex gap-[13px]">
          <div className="flex w-4 flex-none flex-col items-center">
            <span className="box-border size-4 rounded-full border-[2.5px]" style={{ background: s.done ? "var(--tl-ink)" : "var(--tl-white)", borderColor: s.done ? "var(--tl-ink)" : "rgba(11,14,18,.25)" }} />
            {i < pasos.length - 1 && <span className="min-h-[22px] w-0.5 flex-1 bg-ink/15" />}
          </div>
          <div className="flex min-w-0 flex-1 justify-between gap-2.5 pb-3.5">
            <span className={`text-pretty text-[13.5px] leading-[1.3] ${s.done ? "font-bold text-ink" : "font-semibold text-ink/50"}`}>{s.l}</span>
            <span className="flex-none font-mono text-[11px] font-bold text-ink/50">{s.tm}</span>
          </div>
        </div>
      ))}
    </div>
  );
  const editarB = !m.oculta && (
    <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
      <div className={K}>{E2("PUEDES EDITARLA HASTA EL", "YOU CAN EDIT IT UNTIL")}</div>
      <div className="mt-[7px] font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{hasta}</div>
      <div className="mt-3 flex gap-2">
        <div className="grid min-w-0 flex-1"><Button variant="secondary" icon="edit" size="md" disabled={!m.puede} onClick={() => router.push(`/n/${b.id}/resena`)}>{E2("Editar", "Edit")}</Button></div>
        <div className="grid min-w-0 flex-1"><Button variant="secondary" size="md" onClick={() => setBorrar(true)}>{E2("Borrar", "Delete")}</Button></div>
      </div>
      {borrar && (
        <div className="mt-3 rounded-[14px] bg-[rgba(192,57,43,.07)] px-[13px] py-3">
          <div className="text-pretty text-[12.5px] font-semibold leading-[1.5]">{E2(`¿Borrar tu reseña? Se quita de la página de ${b.name} y no se puede recuperar.`, `Delete your review? It is removed from ${b.name}’s page and cannot be recovered.`)}</div>
          <div className="mt-2.5 flex gap-[18px]">
            <button type="button" disabled={ocupado} onClick={quitar} className="text-[13px] font-bold text-danger">{E2("Sí, borrar", "Yes, delete")}</button>
            <button type="button" onClick={() => setBorrar(false)} className="text-[13px] font-bold">{E2("No", "No")}</button>
          </div>
        </div>
      )}
      {error && <div role="alert" className="mt-2.5 text-[12.5px] font-semibold text-danger">{error}</div>}
    </div>
  );
  const ver = <div className="flex"><Button variant="primary" block onClick={ficha}>{E2(`Ver en la página de ${b.name}`, `See it on ${b.name}`)}</Button></div>;
  const num = `${E2("Tu reseña · ", "Your review · ")}${b.name}`.toUpperCase();

  return (
    <div data-pantalla="APP-NEG-RESENA-ESTADO" className="min-h-dvh bg-paper pb-10 lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-RESENA-ESTADO · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2(`Volver a ${b.name}`, `Back to ${b.name}`)} onClick={ficha} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{b.name}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{num}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{aviso}{principal(false)}{asi}{estado}{editarB}{ver}</div>
      </div>
      <div data-screen-label="APP-NEG-RESENA-ESTADO · desktop" className="mx-auto hidden max-w-[1080px] lg:block">
        <button type="button" onClick={ficha} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2(`Volver a ${b.name}`, `Back to ${b.name}`)}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{num}</div>
        <div className="mt-3.5 grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{aviso}{principal(true)}{asi}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">{estado}{editarB}{ver}</div>
        </div>
      </div>
    </div>
  );
}
