"use client";
/* 7a · Centro de ayuda (/ayuda). Plantilla «To'Latino Página» (WEB-AYUDA): rótulo, título, entrada; secciones en tarjetas blancas con su
   título y la lista con puntos; en escritorio la columna de la derecha con «Temas» y la tarjeta oscura «¿No encontraste lo que buscas?».
   Arriba, el buscador (la caja de Buscar) y los chips de tema. Todo lo que llega ya viene filtrado por audiencia desde el servidor. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { FilaAyuda, Hallado, Tema } from "@/lib/compa/ayuda-indice";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = UI.Button as ComponentType<any>, Chip = UI.Chip as ComponentType<any>, Icon = UI.Icon as ComponentType<any>;
const MONO = "'JetBrains Mono',monospace";
type Bi = { es: string; en: string };

export function CentroAyuda({ es, q, t, temas, lista, hallados, conSesion, equipo }: {
  es: boolean; q: string; t: string | null; temas: Tema[]; lista: FilaAyuda[]; hallados: Hallado[] | null; conSesion: boolean; equipo: boolean;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en || x.es);
  const router = useRouter(), [v, setV] = useState(q);
  const buscar = (x: string) => { const s = x.trim(); router.push(s ? `/ayuda?q=${encodeURIComponent(s)}` : "/ayuda"); };
  const tema = (k: string) => temas.find((x) => x.key === k);
  const eyebrow = (s: string) => <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{s}</span>;
  const tarjeta = "rounded-[18px] border border-ink/[.07] bg-white p-[18px]";
  const otraVez = <div className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-4 text-white">
    <span className="font-display text-[16px] font-extrabold leading-[1.3] tracking-[-0.02em]">{E2("¿No encontraste lo que buscas?", "Didn’t find what you need?")}</span>
    <span className="text-[13px] font-medium leading-normal text-white/75">{E2("Si es sobre un pedido, una cita o un boleto, ábrelo y toca Ayuda: el negocio te responde y To’Latino lo revisa. Para lo demás, te contesta una persona del equipo.", "If it’s about an order, a booking or a ticket, open it and tap Help: the business replies and To’Latino reviews it. For anything else, a person on the team replies.")}</span>
    <div className="flex"><Button variant="action" block onClick={() => router.push(conSesion ? "/soporte?nuevo=1" : "/soporte")}>{E2("Escríbenos", "Write to us")}</Button></div>
  </div>;

  const secciones = t ? temas.filter((x) => x.key === t) : temas;
  return (
    <div data-pantalla="WEB-AYUDA" className="min-h-full bg-paper">
      <div className="mx-auto grid max-w-[1120px] items-start px-4 pb-[110px] pt-[18px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12 lg:px-8 lg:pb-14 lg:pt-6">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <div data-screen-label="Ayuda · título" className="flex flex-col gap-2.5">
            {eyebrow(E2("AYUDA", "HELP"))}
            <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] [text-wrap:balance] lg:text-[40px]">{E2("Centro de ayuda", "Help center")}</h1>
            <p className="m-0 text-[15px] font-medium leading-[1.6] text-ink/70">{E2("Respuestas cortas a lo que más nos preguntan, en español y en inglés.", "Short answers to what people ask most, in Spanish and English.")}</p>
          </div>
          <form role="search" onSubmit={(e) => { e.preventDefault(); buscar(v); }} className="flex h-[50px] items-center gap-[9px] rounded-[14px] border-[1.5px] border-ink/10 bg-white pl-[13px] pr-1.5 focus-within:border-ink">
            <Icon name="search" size={18} color="rgba(11,14,18,.45)" />
            <input value={v} onChange={(e) => setV(e.target.value.slice(0, 120))} name="q" enterKeyHint="search" autoComplete="off" aria-label={E2("Buscar en la ayuda", "Search help")}
              placeholder={E2("Busca: devolución, cancelar, boletos…", "Search: refund, cancel, tickets…")} className="h-full min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-semibold text-ink outline-none placeholder:text-ink/40" />
            {v ? <button type="button" aria-label={E2("Borrar", "Clear")} onClick={() => { setV(""); if (q) buscar(""); }} className="grid size-[30px] flex-none place-items-center rounded-full bg-ink/[.07]"><Icon name="close" size={13} strokeWidth={2.2} /></button> : null}
          </form>
          {!q && temas.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0" data-screen-label="Ayuda · temas">
              <Chip variant={!t ? "selected" : "filter"} onClick={() => router.push("/ayuda", { scroll: false })}>{E2("Todo", "All")}</Chip>
              {temas.map((x) => <Chip key={x.key} variant={t === x.key ? "selected" : "filter"} onClick={() => router.push(`/ayuda?t=${x.key}`, { scroll: false })}>{L(x.label)}</Chip>)}
            </div>
          )}
          {hallados ? (
            <div className="flex flex-col gap-3" data-screen-label="Ayuda · resultados">
              {eyebrow(`${hallados.length} ${hallados.length === 1 ? E2("RESULTADO", "RESULT") : E2("RESULTADOS", "RESULTS")} · «${q.toUpperCase()}»`)}
              {hallados.length ? hallados.map((h) => (
                <div key={h.slug} role="link" tabIndex={0} data-ayuda={h.slug} onClick={() => router.push(`/ayuda/${h.slug}${h.lang !== (es ? "es" : "en") ? `?l=${h.lang}` : ""}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/ayuda/${h.slug}`); }} className={`${tarjeta} flex cursor-pointer flex-col gap-1.5 hover:border-ink/20`}>
                  <span className="text-ink/45" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em" }}>{(tema(h.topic) ? L(tema(h.topic)!.label) : "").toUpperCase()}{h.audience === "equipo" ? E2(" · SOLO EQUIPO", " · TEAM ONLY") : ""}</span>
                  <span className="font-display text-[16px] font-extrabold leading-[1.25] tracking-[-0.02em]">{L(h.title)}</span>
                  <span className="text-[13px] font-medium leading-normal text-ink/65"><b className="font-bold text-ink/80">{h.heading}</b> · {h.snippet}</span>
                </div>)) : (
                <div className={`${tarjeta} text-center`}>
                  <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{E2("No encontramos nada con eso", "Nothing found for that")}</div>
                  <div className="mt-1.5 text-[13px] font-medium leading-[1.6] text-ink/60">{E2("Prueba con otra palabra (por ejemplo «cancelar» o «tarjeta») o mira los temas.", "Try another word (for example “cancel” or “card”) or browse the topics.")}</div>
                  <div className="mt-3 flex justify-center"><Button variant="secondary" size="md" onClick={() => { setV(""); buscar(""); }}>{E2("Ver los temas", "See the topics")}</Button></div>
                </div>)}
            </div>
          ) : secciones.map((s) => {
            const items = lista.filter((x) => x.topic === s.key);
            if (!items.length) return null;
            return (
              <section key={s.key} data-screen-label="Ayuda · tema" data-tema={s.key} className={`${tarjeta} flex flex-col gap-2.5`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="m-0 font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]">{L(s.label)}</h2>
                  {s.audience !== "vecino" ? <span className="flex-none rounded-[6px] bg-ink/[.06] px-1.5 py-0.5 text-ink/60" style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".08em" }}>
                    {s.audience === "equipo" ? E2("SOLO EQUIPO", "TEAM ONLY") : s.audience === "negocio" ? E2("PARA TU NEGOCIO", "FOR YOUR BUSINESS") : E2("PARA LA PUERTA", "FOR THE DOOR")}</span> : null}
                </div>
                <p className="m-0 text-[13px] font-medium leading-normal text-ink/60">{L(s.lead)}</p>
                <div className="flex flex-col">
                  {items.map((x) => (
                    <a key={x.slug} href={`/ayuda/${x.slug}`} data-ayuda={x.slug} onClick={(e) => { e.preventDefault(); router.push(`/ayuda/${x.slug}`); }}
                      className="flex items-center gap-2.5 border-t border-ink/[.06] py-[11px] first:border-t-0 first:pt-1">
                      <span className="size-1.5 flex-none rounded-full bg-action" />
                      <span className="min-w-0 flex-1 text-[14px] font-semibold leading-[1.45] text-ink/[.85]">{L(x.title)}</span>
                      <Icon name="chevronRight" size={15} strokeWidth={2} color="rgba(11,14,18,.35)" />
                    </a>))}
                </div>
              </section>);
          })}
          {equipo ? <p className="m-0 text-[12px] font-medium leading-normal text-ink/50">{E2("Ves también la ayuda del equipo porque eres del equipo de To’Latino. Un vecino nunca la ve.", "You also see team help because you are on the To’Latino team. Neighbors never see it.")}</p> : null}
          <div className="lg:hidden">{otraVez}</div>
        </div>
        <div className="sticky top-5 hidden flex-col gap-3.5 lg:flex">
          <div className="rounded-[18px] border border-ink/[.07] bg-white px-4 py-1.5">
            <div className="pb-1 pt-2.5 text-ink/[.42]" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{E2("TEMAS", "TOPICS")}</div>
            {temas.map((x) => (
              <div key={x.key} role="link" tabIndex={0} onClick={() => router.push(`/ayuda?t=${x.key}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/ayuda?t=${x.key}`); }}
                className={`flex cursor-pointer items-center justify-between gap-2.5 border-t border-ink/[.06] py-3 text-[13.5px] font-bold ${t === x.key ? "text-action" : "text-ink"}`}>
                <span>{L(x.label)}</span><span className="flex items-center gap-2 text-ink/40" style={{ font: `600 10px ${MONO}` }}>{x.n}<Icon name="chevronRight" size={15} strokeWidth={2} color="rgba(11,14,18,.4)" /></span>
              </div>))}
          </div>
          {otraVez}
        </div>
      </div>
    </div>
  );
}
