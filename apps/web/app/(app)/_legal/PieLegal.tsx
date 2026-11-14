"use client";
/* 9e · Las piezas con toque de una página legal, del sistema de diseño: «Ver en español / Read in English» (como el artículo de la ayuda), la
   columna «Más en …», la tarjeta oscura «¿No encontraste lo que buscas?» (Button) y el pie de la web (SiteFooter) con todas las páginas legales,
   la ayuda y Soporte. En el teléfono el pie va en acordeón; en escritorio, ancho. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { rutaLegal } from "@/lib/legal-rutas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Icon, SiteFooter } = UI as unknown as Record<"Button" | "Icon" | "SiteFooter", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
type Pag = { k: string; t: string; g: "legal" | "comunidad" | "confianza" };

function useDesk() {
  const [d, setD] = useState(false);
  useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setD(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return d;
}

export function CambiarIdioma({ clave, en }: { clave: string; en: boolean }) {
  const router = useRouter();
  return (
    <button type="button" data-idioma={en ? "es" : "en"} onClick={() => router.replace(`${rutaLegal(clave)}?l=${en ? "es" : "en"}`, { scroll: false })}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/[.12] bg-white px-2.5 py-1 text-[12px] font-bold text-ink">
      <Icon name="language" size={13} />{en ? "Ver en español" : "Read in English"}
    </button>);
}

export function LadoLegal({ en, actual, titulo, mas }: { en: boolean; actual: string; titulo: string; mas: { k: string; t: string }[] }) {
  const router = useRouter(), E2 = (a: string, b: string) => (en ? b : a);
  const ir = (k: string) => router.push(rutaLegal(k, en));
  return (
    <>
      {mas.length ? (
        <div className="rounded-[18px] border border-ink/[.07] bg-white px-4 py-1.5" data-screen-label="Página · más en">
          <div className="pb-1 pt-2.5 text-ink/[.42]" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{`${E2("MÁS EN ", "MORE IN ")}${titulo.toUpperCase()}`}</div>
          {mas.map((x) => (
            <div key={x.k} role="link" tabIndex={0} aria-current={x.k === actual ? "page" : undefined} onClick={() => ir(x.k)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(x.k); } }}
              className={`flex cursor-pointer items-center justify-between gap-2.5 border-t border-ink/[.06] py-3 text-[13.5px] font-bold ${x.k === actual ? "text-action" : "text-ink"}`}>
              <span>{x.t}</span><Icon name="chevronRight" size={15} strokeWidth={2} color="rgba(11,14,18,.4)" />
            </div>))}
        </div>) : null}
      <div className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-4 text-white" data-screen-label="Página · ¿no encontraste?">
        <span className="font-display text-[16px] font-extrabold leading-[1.3] tracking-[-0.02em]">{E2("¿No encontraste lo que buscas?", "Didn’t find what you need?")}</span>
        <span className="text-[13px] font-medium leading-normal text-white/75">{E2("Escríbenos y te responde una persona del equipo.", "Write to us and a person on the team replies.")}</span>
        <div className="flex"><Button variant="action" block onClick={() => router.push("/soporte")}>{E2("Escríbenos", "Write to us")}</Button></div>
      </div>
    </>);
}

export function PieLegal({ en, paginas, ciudad }: { en: boolean; paginas: Pag[]; ciudad: string }) {
  const router = useRouter(), desk = useDesk(), E2 = (a: string, b: string) => (en ? b : a);
  const ir = (r: string) => router.push(r);
  const de = (g: Pag["g"]) => paginas.filter((p) => p.g === g).map((p) => ({ label: p.t, onClick: () => ir(rutaLegal(p.k, en)) }));
  const sections = [
    { title: E2("LEGAL", "LEGAL"), links: de("legal") },
    { title: E2("COMUNIDAD", "COMMUNITY"), links: de("comunidad") },
    { title: E2("AYUDA Y CONFIANZA", "HELP & TRUST"), links: [...de("confianza"), { label: E2("Centro de ayuda", "Help center"), onClick: () => ir("/ayuda") }, { label: E2("Soporte", "Support"), onClick: () => ir("/soporte") }] },
  ].filter((s) => s.links.length);
  return (
    <footer data-pie-legal data-screen-label="Web · pie">
      <SiteFooter layout={desk ? "wide" : "accordion"} assetBase="/assets/" sections={sections}
        quick={desk ? [] : [{ label: E2("Términos", "Terms"), onClick: () => ir(rutaLegal("terminos", en)) }, { label: E2("Privacidad", "Privacy"), onClick: () => ir(rutaLegal("privacidad", en)) }, { label: E2("Soporte", "Support"), onClick: () => ir("/soporte") }]}
        legal={[{ label: E2("TÉRMINOS", "TERMS"), onClick: () => ir("/terminos") }, { label: E2("PRIVACIDAD", "PRIVACY"), onClick: () => ir("/privacidad") }, { label: "COOKIES", onClick: () => ir("/cookies") }]}
        langLabel={en ? "ENGLISH · ES" : "ESPAÑOL · EN"} onLang={() => router.replace(`${window.location.pathname}?l=${en ? "es" : "en"}`, { scroll: false })}
        cityLabel={ciudad.toUpperCase()} onCity={() => ir("/?ciudad")} />
    </footer>);
}
