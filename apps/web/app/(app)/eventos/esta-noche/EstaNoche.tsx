"use client";
/* APP-EVT-NOCHE · móvil y desktop (prototipo nvVals / nvDesk L1178 y sus plantillas). Teléfono: historias verticales a pantalla completa
   (scroll con imán), corazón y enviar a la derecha, abajo cuándo, título, lugar, cuántos van y «Voy · Gratis» o «Boletos» + «Ver más».
   Escritorio: una historia a la vez con flechas. «Voy · Gratis» hace el RSVP (1 persona; las personas se cambian en la ficha); la base
   cuenta el cupo. Con boletos: abre la ficha (la venta en la app llega con 6c). */
import { compartir as compartirNativo } from "@/lib/nativo/compartir";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { HistoriaEvt } from "@/lib/evt-publico";
import { evtCompartir, evtRsvp } from "../acciones";
import { Icon, MONO, useGuardar, useToast } from "../comun";

export function EstaNoche({ es, ciudad, slides, inicio }: { es: boolean; ciudad: string; slides: HistoriaEvt[]; inicio: number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), path = usePathname(), { toast, el } = useToast();
  const g = useGuardar(Object.fromEntries(slides.map((x) => [x.id, x.saved])), toast, es);
  const [i, setI] = useState(inicio), [vas, setVas] = useState<Record<string, boolean>>(Object.fromEntries(slides.map((x) => [x.fecha, x.going])));
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => { const c = caja.current; if (c && inicio > 0) c.scrollTo({ top: c.clientHeight * inicio }); }, [inicio]);
  const cerrar = () => router.push("/eventos");
  const compartir = async (s: HistoriaEvt) => {
    void evtCompartir(s.id);
    const url = `${location.origin}${s.href}`;
    if ((await compartirNativo({ titulo: s.title, url })) === "copiado") toast(E2("Enlace copiado para compartir.", "Link copied to share."));
  };
  const cta = async (s: HistoriaEvt) => {
    if (!s.ctaRsvp || vas[s.fecha]) { router.push(s.href); return; }
    const r = await evtRsvp(s.fecha, 1).catch(() => null);
    if (r && !r.ok && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`${path}?i=${slides.indexOf(s)}`)}`); return; }
    if (!r?.ok) { toast(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); return; }
    setVas((x) => ({ ...x, [s.fecha]: true }));
    toast(E2("Nos vemos ahí. Tu RSVP está guardado.", "See you there. Your RSVP is saved."));
  };
  const ctaL = (s: HistoriaEvt) => (vas[s.fecha] ? E2("Vas · Ver evento", "Going · See event") : s.ctaRsvp ? E2("Voy · Gratis", "Going · Free") : s.free ? E2("Entrada libre", "Free entry") : E2("Boletos", "Tickets"));
  const van = (s: HistoriaEvt) => (s.van > 0 ? (es ? `${s.van} ${s.van === 1 ? "vecino va" : "vecinos van"}` : `${s.van} ${s.van === 1 ? "neighbor going" : "neighbors going"}`) : "");
  const head = E2("EVENTOS · ESTA NOCHE", "EVENTS · TONIGHT");
  const cerrarB = (
    <button type="button" onClick={cerrar} className="flex items-center gap-1.5 text-white/70"><Icon name="close" size={16} /><span style={{ font: `700 10px ${MONO}`, letterSpacing: ".1em" }}>{E2("CERRAR", "CLOSE")}</span></button>
  );
  if (!slides.length) return (
    <div data-pantalla="APP-EVT-NOCHE" className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 bg-ink px-6 text-center text-white">
      <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{head}</div>
      <div className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{E2(`Hoy no hay eventos en ${ciudad}`, `No events in ${ciudad} today`)}</div>
      <div className="max-w-[320px] text-[13px] leading-[1.6] text-white/65">{E2("Mira lo que viene este fin de semana y más adelante.", "See what is coming this weekend and later.")}</div>
      <button type="button" onClick={cerrar} className="mt-2 rounded-[14px] px-5 py-3 text-[13.5px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{E2("Ver todos los eventos", "See all events")}</button>
    </div>
  );
  const cur = slides[Math.min(i, slides.length - 1)]!;
  const corazon = (s: HistoriaEvt, n: number) => (
    <button type="button" aria-label={g.on[s.id] ? E2("Quitar de guardados", "Remove from saved") : E2("Guardar", "Save")} aria-pressed={!!g.on[s.id]} onClick={(ev) => g.toggle(s.id, ev)}
      className="grid place-items-center rounded-full" style={{ width: n, height: n, background: "rgba(11,14,18,.45)", backdropFilter: "blur(8px)", color: g.on[s.id] ? "var(--tl-mod-events)" : "var(--tl-white)" }}>
      <Icon name="heart" size={20} fill={g.on[s.id] ? "var(--tl-mod-events)" : "none"} />
    </button>
  );
  return (
    <div data-pantalla="APP-EVT-NOCHE">
      {/* ── Teléfono ── */}
      <div data-screen-label="APP-EVT-NOCHE · móvil" className="bg-black lg:hidden">
        <div className="flex items-center justify-between bg-ink px-5 py-3 text-white"><span style={{ font: `700 10px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{head}</span>{cerrarB}</div>
        <div ref={caja} className="hs overflow-y-auto" style={{ height: "calc(100dvh - 57px - 43px)", scrollSnapType: "y mandatory" }}>
          {slides.map((s, n) => (
            <div key={s.fecha} data-evento={s.id} className="relative overflow-hidden bg-ink text-white" style={{ height: "calc(100dvh - 57px - 43px)", scrollSnapAlign: "start", scrollSnapStop: "always" }}>
              {s.img ? <img src={s.img} alt="" className="absolute inset-0 block h-full w-full object-cover" /> : null}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,.45),rgba(11,14,18,0) 30%,rgba(11,14,18,0) 45%,rgba(11,14,18,.92) 88%)" }} />
              <div className="absolute left-4 top-3.5 text-white/70" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em" }}>{`${n + 1} / ${slides.length}`}</div>
              <div className="absolute bottom-[150px] right-3 flex flex-col items-center gap-4">
                {corazon(s, 44)}
                <button type="button" onClick={() => compartir(s)} className="flex flex-col items-center gap-1 text-white">
                  <span className="grid size-11 place-items-center rounded-full" style={{ background: "rgba(11,14,18,.45)", backdropFilter: "blur(8px)" }}><Icon name="share" size={20} /></span>
                  <span style={{ font: `700 9.5px ${MONO}` }}>{E2("ENVIAR", "SEND")}</span>
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-[18px] pb-[18px]">
                <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "var(--tl-mod-events)" }}>{s.hora}</div>
                <div className="mt-[7px] max-w-[270px] font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.035em]">{s.title}</div>
                <div className="mt-2 flex items-center gap-[7px] text-white/75" style={{ font: `600 11px ${MONO}`, letterSpacing: ".05em" }}><Icon name="pin" size={13} /><span>{s.lugar}</span></div>
                {van(s) && <div className="mt-2.5 text-white/75" style={{ font: `600 10.5px ${MONO}`, letterSpacing: ".04em" }}>{van(s)}</div>}
                <div className="mt-3.5 flex items-center gap-2.5">
                  <button type="button" onClick={() => cta(s)} className="flex-1 rounded-[14px] p-3.5 text-center text-[14px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{ctaL(s)}</button>
                  <button type="button" onClick={() => router.push(s.href)} className="whitespace-nowrap rounded-[14px] px-4 py-3.5 text-[13px] font-extrabold" style={{ background: "rgba(255,255,255,.12)", backdropFilter: "blur(8px)" }}>{E2("Ver más", "Details")}</button>
                </div>
                <div className="mt-[9px] text-center text-white/50" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".08em" }}>{s.precioT}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div data-screen-label="APP-EVT-NOCHE · desktop" className="hidden bg-ink px-9 pb-[60px] pt-9 text-white lg:block">
        <div className="mx-auto max-w-[1040px]">
          <div className="flex items-center justify-between gap-2.5"><span style={{ font: `700 11px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{head}</span>{cerrarB}</div>
          <div className="mt-[22px] grid items-center gap-6" style={{ gridTemplateColumns: "64px minmax(0,420px) minmax(0,1fr) 64px" }}>
            <button type="button" aria-label={E2("Anterior", "Previous")} onClick={() => setI(Math.max(0, i - 1))} className="grid size-[52px] place-items-center rounded-full bg-white/[.08]" style={{ opacity: i === 0 ? 0.35 : 1 }}><Icon name="chevronLeft" size={20} /></button>
            <div data-evento={cur.id} className="relative overflow-hidden rounded-[26px] bg-[var(--tl-dark-2)]" style={{ aspectRatio: "9 / 14" }}>
              {cur.img ? <img src={cur.img} alt="" className="block h-full w-full object-cover" /> : null}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,.35),rgba(11,14,18,0) 35%,rgba(11,14,18,0) 60%,rgba(11,14,18,.85))" }} />
              <div className="absolute left-[18px] top-4 text-white/75" style={{ font: `700 10px ${MONO}`, letterSpacing: ".14em" }}>{`${i + 1} / ${slides.length}`}</div>
              <div className="absolute inset-x-[18px] bottom-4">
                <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "var(--tl-mod-events)" }}>{cur.hora}</div>
                <div className="mt-1.5 font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.035em]">{cur.title}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-white/70" style={{ font: `600 12px ${MONO}`, letterSpacing: ".05em" }}><Icon name="pin" size={14} /><span>{cur.lugar}</span></div>
              {van(cur) && <div className="mt-3.5 text-white/70" style={{ font: `600 11.5px ${MONO}`, letterSpacing: ".04em" }}>{van(cur)}</div>}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => cta(cur)} className="rounded-[14px] px-[26px] py-3.5 text-[14px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{ctaL(cur)}</button>
                <button type="button" onClick={() => router.push(cur.href)} className="rounded-[14px] bg-white/10 px-5 py-3.5 text-[13.5px] font-extrabold">{E2("Ver más", "Details")}</button>
                {corazon(cur, 48)}
              </div>
              <div className="mt-3 text-white/50" style={{ font: `600 10px ${MONO}`, letterSpacing: ".08em" }}>{cur.precioT}</div>
            </div>
            <button type="button" aria-label={E2("Siguiente", "Next")} onClick={() => setI(Math.min(slides.length - 1, i + 1))} className="grid size-[52px] place-items-center rounded-full bg-white/[.08]" style={{ opacity: i >= slides.length - 1 ? 0.35 : 1 }}><Icon name="chevronRight" size={20} /></button>
          </div>
        </div>
      </div>
      {el}
    </div>
  );
}
