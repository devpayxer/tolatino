import { idioma } from "@/lib/idioma";
import { privacidadDelMapa } from "@/lib/datos/mapa";
import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";
import INV from "../../../../mobile/inventario-datos.json";
import APPS from "../../../../mobile/apps.json";

export const dynamic = "force-dynamic";
export const generateMetadata = metadatos("privacidad");

/* 8i → 9e · /privacidad — pública, sin sesión (la piden Apple y Google; las fichas de las tiendas apuntan aquí). El TEXTO sale de
   docs/legal/us/privacidad.{es,en}.md y su adenda del estado (lib/legal.ts; guardián legalUnaFuente). Debajo, dos tarjetas que salen de los
   DATOS reales, no de un texto: «Los datos que usamos y para qué» del inventario (apps/mobile/inventario-datos.json, el mismo de las etiquetas de
   Apple, el CSV de Google y el PrivacyInfo.xcprivacy; guardián mapaDeDatos) y «Qué pasa con cada dato al borrar tu cuenta» del mapa de datos
   (data_map, el mismo que usan la exportación y la purga de 9d). ?l=en|es cambia el idioma. */
type Bi = { es: string; en: string };
type Cat = { key: string; label: Bi; uso: Bi; propositos: string[]; apps: string[]; opcional: boolean; guarda: Bi };
const I = INV as unknown as { version: string; propositos: Record<string, Bi>; categorias: Cat[] };
const NOMBRE = Object.fromEntries((APPS.apps as { key: string; nombre: Bi }[]).map((a) => [a.key, a.nombre]));
const MONO = "'JetBrains Mono',monospace";

export default async function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  const [sp, lang, M] = await Promise.all([searchParams, idioma(), privacidadDelMapa()]);
  const v = sp.l === "en" || sp.l === "es" ? sp.l : lang, es = v === "es", E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const tarjeta = "rounded-[18px] border border-ink/[.07] bg-white p-[18px] flex flex-col gap-2.5";
  const h2 = "m-0 font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]";
  const p = "m-0 text-[14px] leading-[1.55] text-ink/75";
  const tag = (t: string) => <span key={t} className="rounded-[6px] bg-ink/[.06] px-1.5 py-0.5 text-ink/60" style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".08em" }}>{t}</span>;
  return (
    <PaginaLegal clave="privacidad" searchParams={searchParams}>
      <section className={tarjeta} data-screen-label="Privacidad · los datos" lang={v}>
        <h2 className={h2}>{E2("Los datos que usamos y para qué", "The data we use and why")}</h2>
        <p className={p}>{E2(`Sale del inventario de datos (versión ${I.version}), el mismo que damos a Apple y a Google.`, `From the data inventory (version ${I.version}), the same one we give Apple and Google.`)}</p>
        {I.categorias.map((c) => (
          <div key={c.key} data-dato={c.key} className="flex flex-col gap-1.5 border-t border-ink/[.06] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] font-extrabold text-ink">{L(c.label)}</span>
              {c.opcional ? tag(E2("OPCIONAL", "OPTIONAL")) : null}
            </div>
            <p className={p}>{L(c.uso)}</p>
            <span className="text-[12.5px] text-ink/60">{E2("Para: ", "For: ")}{c.propositos.map((k) => L(I.propositos[k]!)).join(" · ")}</span>
            <span className="text-[12.5px] text-ink/60">{E2("En: ", "In: ")}{c.apps.map((a) => NOMBRE[a] ? L(NOMBRE[a]!) : a).join(" · ")}</span>
            <span className="text-[12.5px] text-ink/60">{E2("Se guarda: ", "Kept: ")}{L(c.guarda)}</span>
          </div>))}
      </section>
      <section className={tarjeta} data-screen-label="Privacidad · al borrar tu cuenta" data-mapa lang={v}>
        <h2 className={h2}>{E2("Qué pasa con cada dato al borrar tu cuenta", "What happens to each piece of data when you delete your account")}</h2>
        <p className={p}>{E2("Sale del mapa de datos, el mismo que usa la purga a los 30 días.", "From the data map, the same one the 30-day purge uses.")}</p>
        {([["borrar", E2("Se borra", "Deleted")], ["vaciar", E2("Queda sin lo que escribiste o subiste", "Kept without what you wrote or uploaded")],
          ["seudonimizar", E2("Queda sin tu nombre ni tu teléfono", "Kept without your name or phone")], ["guardar", E2("Se guarda, con su porqué", "Kept, with its reason")]] as const).map(([a, t]) => (
          <div key={a} data-accion={a} className="flex items-baseline justify-between gap-3 border-t border-ink/[.06] pt-3">
            <span className="text-[14px] font-bold text-ink">{t}</span>
            <span className="flex-none text-ink/60" style={{ font: `700 10px ${MONO}`, letterSpacing: ".08em" }}>{`${M.n[a]} ${E2(M.n[a] === 1 ? "TIPO DE DATO" : "TIPOS DE DATOS", M.n[a] === 1 ? "KIND OF DATA" : "KINDS OF DATA")}`}</span>
          </div>))}
        <div className="flex flex-col gap-1.5 border-t border-ink/[.06] pt-3">
          <span className="text-[13px] font-bold text-ink">{E2("Por qué se guarda lo que se guarda", "Why what is kept is kept")}</span>
          {M.porques.map((x) => <span key={x.es} data-porque className="text-[13px] leading-[1.5] text-ink/70">{L(x)}</span>)}
        </div>
        <div className="flex flex-col gap-2 border-t border-ink/[.06] pt-3">
          <span className="text-[13px] font-bold text-ink">{E2("Lo que trae «Descargar mis datos»", "What «Download my data» includes")}</span>
          <div className="flex flex-wrap gap-1.5">{M.archivos.map((x) => tag(`${x}.json`))}</div>
        </div>
      </section>
    </PaginaLegal>);
}
