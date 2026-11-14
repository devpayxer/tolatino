import type { Metadata } from "next";
import type { ReactNode } from "react";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { paginaPara, titulosLegales, type ClaveLegal, type VersionLegal } from "@/lib/legal";
import { ubicacion } from "@/lib/ubicacion";
import { Md } from "../ayuda/md";
import { CambiarIdioma, LadoLegal, PieLegal } from "./PieLegal";

/* 9e · Una página legal pública (/terminos, /privacidad, /cookies, /reglas, /verificamos, /votos, /seguridad, /ia, /dmca, /vivienda-justa,
   /accesibilidad): plantilla «To'Latino Página» (APP-WEB, docs/diseno/pantallas/To'Latino Página.dc.html) — rótulo del grupo, título, resumen,
   versión y vigencia, una tarjeta blanca por sección; en escritorio, la columna «Más en …» y la tarjeta oscura «¿No encontraste lo que buscas?»;
   abajo, el pie de la web (SiteFooter) con todas las páginas. Sin sesión, en ES y EN (?l=en|es). EL TEXTO NO VIVE AQUÍ: sale de docs/legal/ por
   lib/legal.ts (guardián legalUnaFuente). Lo que no está publicado (el sandbox) dice BORRADOR; con la adenda del estado de la persona debajo. */
type Bi = { es: string; en: string };
const MONO = "'JetBrains Mono',monospace";
const GRUPO: Record<ClaveLegal, "legal" | "comunidad" | "confianza"> = {
  terminos: "legal", privacidad: "legal", cookies: "legal", ia: "legal", dmca: "legal", accesibilidad: "legal",
  reglas: "comunidad", votos: "comunidad", verificamos: "confianza", seguridad: "confianza", "vivienda-justa": "confianza",
};
const NOMBRE_GRUPO: Record<string, Bi> = { legal: { es: "Legal", en: "Legal" }, comunidad: { es: "Comunidad", en: "Community" }, confianza: { es: "Ayuda y confianza", en: "Help & trust" } };
const ESTADOS: Record<string, Bi> = { PA: { es: "Pennsylvania", en: "Pennsylvania" }, NJ: { es: "Nueva Jersey", en: "New Jersey" }, NY: { es: "Nueva York", en: "New York" } };

type Sp = Promise<{ l?: string }>;
async function leer(clave: ClaveLegal, sp: Sp) {
  const [q, lang, u] = await Promise.all([sp, idioma(), yo().catch(() => null)]);
  const loc = await ubicacion(u).catch(() => null);
  const ver: "es" | "en" = q.l === "en" || q.l === "es" ? q.l : lang;
  const [p, titulos] = await Promise.all([paginaPara({ userId: u?.id ?? null, ciudad: loc?.c.id ?? null }, clave), titulosLegales()]);
  return { ver, p, titulos, ciudad: loc ? `${loc.c.name}, ${loc.c.state}` : "Hazleton, PA" };
}

export function metadatos(clave: ClaveLegal) {
  return async function generateMetadata({ searchParams }: { searchParams: Sp }): Promise<Metadata> {
    const { ver, p } = await leer(clave, searchParams);
    const t = p ? (ver === "en" ? p.general.title.en : p.general.title.es) : "To'Latino";
    return { title: `${t} · To'Latino`, description: p ? (ver === "en" ? p.general.lead.en : p.general.lead.es).slice(0, 160) : undefined,
      robots: p?.general.status === "publicado" ? undefined : { index: false } };
  };
}

/* Las secciones «##» de un cuerpo (las «###» van dentro de la tarjeta). */
function secciones(md: string): { h: string; body: string }[] {
  const out: { h: string; body: string[] }[] = [];
  for (const l of md.replace(/\r/g, "").split("\n")) {
    const h = /^## (.+)$/.exec(l);
    if (h) out.push({ h: h[1]!.trim(), body: [] }); else if (out.length) out[out.length - 1]!.body.push(l);
  }
  return out.map((s) => ({ h: s.h, body: s.body.join("\n").trim() }));
}
function Cuerpo({ md, es }: { md: string; es: boolean }) {
  return <>{secciones(md).map((s, i) => (
    <section key={i} data-screen-label="Página · sección" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-[18px]">
      <h2 className="m-0 font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]">{s.h}</h2>
      {s.body.split(/\n(?=### )/).map((b, j) => {
        const h3 = /^### (.+)\n?([\s\S]*)$/.exec(b);
        return h3 ? <div key={j} className="mt-1 flex flex-col gap-2.5"><h3 className="m-0 font-display text-[15px] font-extrabold leading-[1.25] tracking-[-0.02em]">{h3[1]}</h3>
          <Md texto={h3[2] ?? ""} vis={{}} es={es} rutas /></div> : <Md key={j} texto={b} vis={{}} es={es} rutas />;
      })}
    </section>))}</>;
}

const fecha = (iso: string, en: boolean) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "").toUpperCase();
function linea(v: VersionLegal, en: boolean): string {
  const E2 = (a: string, b: string) => (en ? b : a);
  if (v.status === "publicado" && v.effective_at) return `${E2("VERSIÓN ", "VERSION ")}${v.version}${E2(" · VIGENTE DESDE ", " · EFFECTIVE ")}${fecha(v.effective_at, en)}`;
  return `${v.status === "revisado" ? E2("REVISADA · SIN PUBLICAR", "REVIEWED · NOT PUBLISHED") : E2("BORRADOR", "DRAFT")} · ${E2("VERSIÓN ", "VERSION ")}${v.version} · ${E2("TEXTO DEL ", "TEXT OF ")}${v.text_date.toUpperCase()}`;
}

export async function PaginaLegal({ clave, searchParams, children }: { clave: ClaveLegal; searchParams: Sp; children?: ReactNode }) {
  const { ver, p, titulos, ciudad } = await leer(clave, searchParams);
  const en = ver === "en", E2 = (a: string, b: string) => (en ? b : a), L = (x: Bi) => (en ? x.en : x.es);
  const g = GRUPO[clave], grupo = L(NOMBRE_GRUPO[g]!);
  const mas = titulos.filter((t) => GRUPO[t.key] === g);
  const v = p?.general;
  const tarjeta = "rounded-[18px] border border-ink/[.07] bg-white p-[18px]";
  const lado = <LadoLegal en={en} actual={clave} titulo={grupo} mas={mas.map((x) => ({ k: x.key, t: L(x.title) }))} />;
  return (
    <div data-pantalla="WEB-LEGAL" data-legal={clave} data-version={v?.version ?? ""} data-estado={v?.status ?? "sin-publicar"} className="min-h-full bg-paper">
      <div className="mx-auto grid max-w-[1120px] items-start px-4 pb-10 pt-[18px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12 lg:px-8 lg:pb-14 lg:pt-6">
        <article className="flex min-w-0 flex-col gap-[18px]" lang={ver}>
          <div data-screen-label="Página · título" className="flex flex-col gap-2.5">
            <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{grupo.toUpperCase()}</span>
            <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] [text-wrap:balance] lg:text-[40px]">{v ? L(v.title) : E2("Esta página se está revisando", "This page is being reviewed")}</h1>
            {v ? <p className="m-0 text-[15px] font-medium leading-[1.6] text-ink/70 [text-wrap:pretty]">{L(v.lead)}</p> : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {v ? <span data-version-linea className="text-ink/45" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em" }}>{linea(v, en)}</span> : null}
              <CambiarIdioma clave={clave} en={en} />
            </div>
          </div>
          {v && v.status !== "publicado" ? (
            <div data-borrador className="rounded-[14px] bg-ink/[.05] px-4 py-3 text-[13px] font-semibold leading-normal text-ink/75">
              {E2("BORRADOR — pendiente de revisión legal. Lo que dice sale de lo que To'Latino hace hoy; el texto final lo revisa un abogado antes de abrir.",
                "DRAFT — pending legal review. What it says comes from what To'Latino does today; a lawyer reviews the final text before opening.")}
            </div>) : null}
          {v ? <Cuerpo md={L(v.body)} es={!en} /> : (
            <div className={`${tarjeta} text-[14px] font-medium leading-[1.6] text-ink/75`}>{E2("La versión nueva de esta página se publica pronto. Si tienes una pregunta, escríbenos.", "The new version of this page is published soon. If you have a question, write to us.")}</div>)}
          {p?.adenda ? (
            <div data-adenda={p.adenda.jurisdiction} className="flex flex-col gap-[18px]">
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{(ESTADOS[p.estado] ? L(ESTADOS[p.estado]!) : p.estado).toUpperCase()}</span>
                <h2 className="m-0 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em]">{L(p.adenda.title)}</h2>
                <p className="m-0 text-[14px] font-medium leading-[1.6] text-ink/70">{L(p.adenda.lead)}</p>
                <span className="text-ink/45" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em" }}>{linea(p.adenda, en)}</span>
              </div>
              <Cuerpo md={L(p.adenda.body)} es={!en} />
            </div>) : null}
          {children}
          <div className="flex flex-col gap-3.5 lg:hidden">{lado}</div>
        </article>
        <div className="sticky top-5 hidden flex-col gap-3.5 lg:flex">{lado}</div>
      </div>
      <PieLegal en={en} ciudad={ciudad} paginas={titulos.map((t) => ({ k: t.key, t: L(t.title), g: GRUPO[t.key] }))} />
    </div>);
}
