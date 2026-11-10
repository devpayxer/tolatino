"use client";
/* 7a · El artículo (plantilla «To'Latino Página»): «Volver» al Centro de ayuda, rótulo del tema, título, versión y «Ver en inglés / en
   español»; cada sección `##` en su tarjeta blanca (las `###` dentro); al pie, la tarjeta oscura «¿No es lo que buscabas?» (hasta que
   exista Soporte, lleva a Mi cuenta: la ayuda de cada pedido, cita o boleto). En escritorio, la columna «Más en {tema}». El texto ya viene
   filtrado por audiencia; un artículo pausado solo dice que se está revisando (el equipo lo ve con su motivo). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import type { Articulo, FilaAyuda, Seccion, Tema } from "@/lib/compa/ayuda-indice";
import { Md, type Visibles } from "../md";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = UI.Button as ComponentType<any>, Icon = UI.Icon as ComponentType<any>;
const MONO = "'JetBrains Mono',monospace";
type Bi = { es: string; en: string };
const MES_EN: Record<string, string> = { ene: "Jan", feb: "Feb", mar: "Mar", abr: "Apr", may: "May", jun: "Jun", jul: "Jul", ago: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dic: "Dec" };

export function ArticuloAyuda({ es, ver, a, tema, mismos, vis, conSesion }: { es: boolean; ver: "es" | "en"; a: Articulo; tema: Tema | null; mismos: FilaAyuda[]; vis: Visibles; conSesion: boolean }) {
  const E2 = (x: string, y: string) => (es ? x : y), L = (x: Bi) => (es ? x.es : x.en || x.es);
  const router = useRouter();
  const enIngles = ver === "en", V = (x: string, y: string) => (enIngles ? y : x);
  const secs = a.secciones[ver].length ? a.secciones[ver] : a.secciones[ver === "en" ? "es" : "en"];
  const [d, m, y] = a.version.split(" ");
  const fecha = enIngles ? `${MES_EN[m ?? ""] ?? m} ${d}, ${y}` : a.version;
  const tarjeta = "rounded-[18px] border border-ink/[.07] bg-white p-[18px]";
  const tag = (t: string) => <span className="flex-none rounded-[6px] bg-ink/[.06] px-1.5 py-0.5 text-ink/60" style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".08em" }}>{t}</span>;

  // Tarjetas: una por sección `##`; las `###` van dentro de la tarjeta anterior.
  const grupos: Seccion[][] = [];
  for (const s of secs) { if (s.nivel === 2 || !grupos.length) grupos.push([s]); else grupos[grupos.length - 1]!.push(s); }
  const otraVez = <div className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-4 text-white" data-screen-label="Ayuda · ¿no es lo que buscabas?">
    <span className="font-display text-[16px] font-extrabold leading-[1.3] tracking-[-0.02em]">{E2("¿No es lo que buscabas?", "Not what you were looking for?")}</span>
    <span className="text-[13px] font-medium leading-normal text-white/75">{E2("Si es sobre un pedido, una cita o un boleto, ábrelo y toca Ayuda: el negocio te responde y To’Latino lo revisa.", "If it’s about an order, a booking or a ticket, open it and tap Help: the business replies and To’Latino reviews it.")}</span>
    <div className="flex"><Button variant="action" block onClick={() => router.push(conSesion ? "/cuenta" : "/entrar")}>{conSesion ? E2("Ir a Mi cuenta", "Go to My account") : E2("Entrar", "Sign in")}</Button></div>
    <div role="link" tabIndex={0} onClick={() => router.push("/ayuda")} onKeyDown={(e) => { if (e.key === "Enter") router.push("/ayuda"); }}
      className="cursor-pointer self-center py-1 text-[13px] font-bold text-white/80">{E2("Buscar en la ayuda", "Search help")}</div>
  </div>;
  const mas: ReactNode = mismos.length ? (
    <div className="rounded-[18px] border border-ink/[.07] bg-white px-4 py-1.5">
      <div className="pb-1 pt-2.5 text-ink/[.42]" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{`${E2("MÁS EN ", "MORE IN ")}${(tema ? L(tema.label) : "").toUpperCase()}`}</div>
      {mismos.map((x) => (
        <div key={x.slug} role="link" tabIndex={0} onClick={() => router.push(`/ayuda/${x.slug}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/ayuda/${x.slug}`); }}
          className="flex cursor-pointer items-center justify-between gap-2.5 border-t border-ink/[.06] py-3 text-[13.5px] font-bold text-ink">
          <span>{L(x.title)}</span><Icon name="chevronRight" size={15} strokeWidth={2} color="rgba(11,14,18,.4)" />
        </div>))}
    </div>) : null;

  return (
    <div data-pantalla="WEB-AYUDA-ARTICULO" data-ayuda={a.slug} className="min-h-full bg-paper">
      <div className="mx-auto grid max-w-[1120px] items-start px-4 pb-[110px] pt-[18px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12 lg:px-8 lg:pb-14 lg:pt-6">
        <article className="flex min-w-0 flex-col gap-[18px]" lang={ver}>
          <div role="link" tabIndex={0} onClick={() => router.push(tema ? `/ayuda?t=${tema.key}` : "/ayuda")} onKeyDown={(e) => { if (e.key === "Enter") router.push("/ayuda"); }}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-bold text-action">
            <Icon name="chevronLeft" size={15} strokeWidth={2} />{E2("Centro de ayuda", "Help center")}
          </div>
          <div data-screen-label="Ayuda · artículo · título" className="flex flex-col gap-2.5">
            <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{(tema ? L(tema.label) : E2("AYUDA", "HELP")).toUpperCase()}</span>
            <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] [text-wrap:balance] lg:text-[40px]">{enIngles ? a.title.en : a.title.es}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-ink/45" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em" }}>{`${V("ACTUALIZADO EL ", "UPDATED ")}${fecha.toUpperCase()}`}</span>
              {a.audience === "equipo" ? tag(E2("SOLO EQUIPO", "TEAM ONLY")) : a.audience === "negocio" ? tag(E2("PARA TU NEGOCIO", "FOR YOUR BUSINESS")) : a.audience === "portero" ? tag(E2("PARA LA PUERTA", "FOR THE DOOR")) : null}
              {a.status === "live" || a.paused_reason ? (
                <button type="button" data-idioma={enIngles ? "es" : "en"} onClick={() => router.replace(`/ayuda/${a.slug}?l=${enIngles ? "es" : "en"}`, { scroll: false })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/[.12] bg-white px-2.5 py-1 text-[12px] font-bold text-ink">
                  <Icon name="language" size={13} />{enIngles ? "Ver en español" : "See in English"}
                </button>) : null}
            </div>
          </div>
          {a.status === "paused" ? (
            <div className={`${tarjeta} flex flex-col gap-1.5`} data-estado="pausado">
              <span className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{E2("Este artículo se está revisando", "This article is being reviewed")}</span>
              <span className="text-[13px] font-medium leading-normal text-ink/65">{a.paused_reason
                ? E2(`PAUSADO POR EL EQUIPO · ${a.paused_reason}. El Centro de ayuda no lo muestra a nadie más hasta que se vuelva a usar.`, `PAUSED BY THE TEAM · ${a.paused_reason}. The Help center shows it to nobody else until it is used again.`)
                : E2("El equipo de To’Latino lo está poniendo al día. Mientras, mira los otros artículos de este tema.", "The To’Latino team is updating it. Meanwhile, see the other articles on this topic.")}</span>
            </div>) : null}
          {grupos.map((g, i) => (
            <section key={i} className={`${tarjeta} flex flex-col gap-2.5`} data-screen-label="Ayuda · artículo · sección" data-equipo={g[0]!.equipo ? "1" : undefined}>
              {g.map((s, j) => (
                <div key={j} className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    {s.nivel === 2 ? <h2 className="m-0 font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]">{s.heading}</h2>
                      : <h3 className={`m-0 font-display text-[15px] font-extrabold leading-[1.25] tracking-[-0.02em] ${j ? "mt-2" : ""}`}>{s.heading}</h3>}
                    {s.equipo && (j === 0 || !g[0]!.equipo) ? tag(E2("SOLO EQUIPO", "TEAM ONLY")) : null}
                  </div>
                  {s.body ? <Md texto={s.body} vis={vis} es={!enIngles} /> : null}
                </div>))}
            </section>))}
          <div className="flex flex-col gap-3.5 lg:hidden">{otraVez}{mas}</div>
        </article>
        <div className="sticky top-5 hidden flex-col gap-3.5 lg:flex">{mas}{otraVez}</div>
      </div>
    </div>
  );
}
