"use client";
/* C-003 · Patrocinados de la página de Eventos (canvas tolatino-master+, «Eventos (variantes)» D; prototipo APP-EVT-BUSQ «Eventos · Patrocinado
   (C-003)» y «Eventos · Patrocinados · desktop (C-003)»). Teléfono: un Patrocinado a pantalla casi completa (400 de alto) que se desliza, con
   los puntos de los puestos y la palabra PATROCINADO (no hay título de sección que lo diga). Computadora: una fila de tarjetas altas con el título
   «Patrocinados». La lista la decide el servidor (lib/evt-publico.ts · patrocinadosEventos: activos, pagados, de esta ciudad); aquí solo se pinta
   y, al tocar, se cuenta «entraron» antes de abrir la página del evento. El panel usa la tarjeta para la vista previa (TarjetaPatEvt, sin acción). */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { TarjetaEvt } from "@/lib/evt-publico";
import { dinero } from "@/lib/evt-comun";
import { entroPatrocinado } from "../acciones-patrocinio";
import { MONO } from "./comun";
import { Foto } from "@tolatino/ui";

export type PatEvt = TarjetaEvt & { sid: string };
const ctaDe = (k: TarjetaEvt, es: boolean) => (k.free ? (es ? "Ver evento" : "See event") : es ? "Boletos" : "Tickets");
const precioDe = (k: TarjetaEvt, es: boolean) => (k.free ? (es ? "GRATIS" : "FREE") : k.desde != null ? `${es ? "DESDE " : "FROM "}${dinero(k.desde)}` : "");
const metaDe = (k: TarjetaEvt, es: boolean) => `${k.venue} · ${k.edad ? `${k.edad}+` : es ? "TODAS LAS EDADES" : "ALL AGES"}`.toUpperCase();

/* La tarjeta alta de la computadora (y la vista previa del panel con `chica`). */
export function TarjetaPatEvt({ k, es, onOpen, chica = false, sid }: { k: TarjetaEvt; es: boolean; onOpen?: () => void; chica?: boolean; sid?: string }) {
  return (
    <div role={onOpen ? "link" : undefined} tabIndex={onOpen ? 0 : undefined} aria-label={k.title} onClick={onOpen} onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(); } : undefined}
      data-patrocinado-evt={sid} className={`relative overflow-hidden rounded-[22px] bg-ink text-white ${chica ? "h-[260px] w-[200px]" : "h-[300px]"} ${onOpen ? "cursor-pointer" : ""}`}>
      {k.img ? <Foto src={k.img} alt="" ancho={chica ? 200 : 540} className="absolute inset-0 block h-full w-full object-cover opacity-[.62]" /> : null}
      <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-[60px]" style={{ background: "linear-gradient(180deg,rgba(11,14,18,0),rgba(11,14,18,.92))" }}>
        <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "var(--tl-mod-events)" }}>{k.cuando}</div>
        <div className="mt-1.5 line-clamp-2 font-display text-[18px] font-extrabold leading-[1.15] tracking-[-0.03em]">{k.title}</div>
        <div className="mt-1.5 truncate text-white/70" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em" }}>{metaDe(k, es)}</div>
        <div className="mt-[11px] flex items-center gap-[9px]">
          <span className="rounded-[13px] px-3.5 py-2.5 text-[12.5px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{ctaDe(k, es)}</span>
          <span className="whitespace-nowrap text-white/80" style={{ font: `700 10.5px ${MONO}`, letterSpacing: ".06em" }}>{precioDe(k, es)}</span>
        </div>
      </div>
    </div>
  );
}

export function PatrocinadosEventos({ items, es, movil, conMios }: { items: PatEvt[]; es: boolean; movil: boolean; conMios?: boolean }) {
  const router = useRouter(), caja = useRef<HTMLDivElement>(null), [i, setI] = useState(0);
  if (!items.length) return null;
  const abrir = (p: PatEvt) => () => { void entroPatrocinado("evento", p.sid).catch(() => undefined); router.push(p.href); };
  if (!movil) return (
    <div data-screen-label="Eventos · Patrocinados · desktop (C-003)" data-patrocinados-evt={items.length}>
      <h2 className="font-display text-[21px] font-extrabold leading-none tracking-[-0.03em]">{es ? "Patrocinados" : "Sponsored"}</h2>
      <div className="mt-3.5 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
        {items.map((p) => <TarjetaPatEvt key={p.sid} sid={p.sid} k={p} es={es} onOpen={abrir(p)} />)}
      </div>
    </div>
  );
  const onScroll = () => { const el = caja.current; if (!el) return; const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (n !== i) setI(n); };
  return (
    <div data-screen-label="Eventos · Patrocinado (C-003)" data-patrocinados-evt={items.length} className={`relative ${conMios ? "mt-3" : ""}`}>
      <div ref={caja} onScroll={onScroll} className="hs flex snap-x snap-mandatory overflow-x-auto">
        {items.map((p) => (
          <div key={p.sid} role="link" tabIndex={0} aria-label={p.title} data-patrocinado-evt={p.sid} onClick={abrir(p)} onKeyDown={(e) => { if (e.key === "Enter") abrir(p)(); }}
            className="relative h-[400px] w-full flex-none cursor-pointer snap-start overflow-hidden bg-ink text-white">
            {p.img ? <Foto src={p.img} alt="" ancho={540} className="absolute inset-0 block h-full w-full object-cover opacity-60" /> : null}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,.1) 30%,rgba(11,14,18,.92))" }} />
            <div className="absolute inset-x-5 bottom-5">
              <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{p.cuando}</div>
              <div className="mt-2 font-display text-[28px] font-extrabold leading-[1.06] tracking-[-0.04em]">{p.title}</div>
              <div className="mt-2 text-white/70" style={{ font: `600 10.5px ${MONO}`, letterSpacing: ".08em" }}>{metaDe(p, es)}</div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <span className="rounded-[13px] px-5 py-3 text-[13.5px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{ctaDe(p, es)}</span>
                <span className="text-white/80" style={{ font: `700 11px ${MONO}`, letterSpacing: ".06em" }}>{precioDe(p, es)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 ? <div aria-hidden className="pointer-events-none absolute left-5 top-4 flex gap-1">{items.map((p, n) => <span key={p.sid} className="h-[3px] w-[22px] rounded-full" style={{ background: n === i ? "var(--tl-white)" : "rgba(255,255,255,.35)" }} />)}</div> : null}
      <span className="pointer-events-none absolute right-5 top-3 text-white/75" style={{ font: `800 9px ${MONO}`, letterSpacing: ".12em" }}>{es ? "PATROCINADO" : "SPONSORED"}</span>
    </div>
  );
}
