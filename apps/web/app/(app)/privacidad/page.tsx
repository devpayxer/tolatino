import type { Metadata } from "next";
import { idioma } from "@/lib/idioma";
import INV from "../../../../mobile/inventario-datos.json";
import APPS from "../../../../mobile/apps.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacidad · To'Latino", description: "Cómo usa To'Latino tus datos: qué guarda, para qué y cómo lo borras.", robots: { index: false } };

/* 8i · /privacidad — pública, sin sesión (la piden Apple y Google; fase8-apps.md §6 #26). BORRADOR versión 0: la sección de datos sale del
   inventario REAL (apps/mobile/inventario-datos.json, el mismo de las etiquetas de Apple, el CSV de Google y el PrivacyInfo.xcprivacy;
   guardián privacidadCoherente). El texto legal final y la revisión de abogado son de la Fase 9. Misma plantilla que un artículo de la Ayuda
   («To'Latino Página»): rótulo, título, versión y una tarjeta blanca por sección. ?l=en|es cambia el idioma de la página. */
type Bi = { es: string; en: string };
type Cat = { key: string; label: Bi; uso: Bi; propositos: string[]; apps: string[]; opcional: boolean; guarda: Bi };
const I = INV as unknown as { version: string; fecha: string; rastreo: boolean; borrarCuenta: Bi; propositos: Record<string, Bi>; categorias: Cat[] };
const NOMBRE = Object.fromEntries((APPS.apps as { key: string; nombre: Bi }[]).map((a) => [a.key, a.nombre]));
const MONO = "'JetBrains Mono',monospace";

export default async function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  const [sp, lang] = await Promise.all([searchParams, idioma()]);
  const v = sp.l === "en" || sp.l === "es" ? sp.l : lang, es = v === "es", E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const tarjeta = "rounded-[18px] border border-ink/[.07] bg-white p-[18px] flex flex-col gap-2.5";
  const h2 = "m-0 font-display text-[19px] font-extrabold tracking-[-0.02em]";
  const p = "m-0 text-[14px] leading-[1.55] text-ink/80";
  const tag = (t: string) => <span key={t} className="rounded-[6px] bg-ink/[.06] px-1.5 py-0.5 text-ink/60" style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".08em" }}>{t}</span>;
  const [y, m, d] = I.fecha.split("-");
  return (
    <div data-pantalla="WEB-PRIVACIDAD" className="min-h-full bg-paper">
      <div className="mx-auto flex max-w-[760px] flex-col gap-[18px] px-4 pb-[110px] pt-[18px] lg:px-8 lg:pb-14 lg:pt-6" lang={v}>
        <div className="flex flex-col gap-2.5">
          <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{E2(`PRIVACIDAD · BORRADOR · VERSIÓN ${I.version}`, `PRIVACY · DRAFT · VERSION ${I.version}`)}</span>
          <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] lg:text-[40px]">{E2("Cómo usa To'Latino tus datos", "How To'Latino uses your data")}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-ink/45" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em" }}>{E2(`ACTUALIZADO EL ${d} ${["", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"][Number(m)]} ${y}`, `UPDATED ${["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(m)]} ${d}, ${y}`)}</span>
            <a href={`/privacidad?l=${es ? "en" : "es"}`} className="text-[13px] font-bold text-action">{es ? "Read in English" : "Ver en español"}</a>
          </div>
        </div>
        <div data-screen-label="Privacidad · borrador" className="rounded-[14px] bg-ink/[.05] px-4 py-3 text-[13px] font-semibold leading-normal text-ink/75">
          {E2("Esto es un borrador. Lo que dice sobre tus datos sale de la lista real de lo que To'Latino guarda; el texto legal final se publica antes de abrir To'Latino al público.",
            "This is a draft. What it says about your data comes from the real list of what To'Latino keeps; the final legal text is published before To'Latino opens to the public.")}
        </div>
        <section className={tarjeta} data-screen-label="Privacidad · lo que no hacemos">
          <h2 className={h2}>{E2("Lo que no hacemos", "What we do not do")}</h2>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.55] text-ink/80">
            <li>{E2("No te rastreamos entre apps ni sitios. No usamos el identificador de anuncios del teléfono.", "We do not track you across apps or websites. We do not use the phone's advertising ID.")}</li>
            <li>{E2("No hay publicidad de terceros en To'Latino y no vendemos ni compartimos tus datos para anuncios.", "There is no third-party advertising on To'Latino and we do not sell or share your data for ads.")}</li>
            <li>{E2("La analítica es propia: no sale de To'Latino.", "Analytics are our own: they never leave To'Latino.")}</li>
            <li>{E2("Todo viaja cifrado (HTTPS).", "Everything travels encrypted (HTTPS).")}</li>
          </ul>
        </section>
        <section className={tarjeta} data-screen-label="Privacidad · los datos">
          <h2 className={h2}>{E2("Los datos que usamos y para qué", "The data we use and why")}</h2>
          <p className={p}>{E2("Cada dato, para qué se usa, en qué apps y cuánto tiempo se guarda. Todos quedan ligados a tu cuenta.", "Each piece of data, what it is for, in which apps and how long it is kept. All of it is linked to your account.")}</p>
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
        <section className={tarjeta} data-screen-label="Privacidad · con quién">
          <h2 className={h2}>{E2("Con quién se comparte", "Who it is shared with")}</h2>
          <p className={p}>{E2("Con el negocio con el que haces algo (tu pedido, tu cita, tu boleto), solo lo que necesita para atenderte. Y con los servicios que trabajan para To'Latino: Stripe para cobrar con tarjeta, el servicio de mensajes de texto para tu código de entrada, Apple y Google para los avisos al teléfono y el servicio de correo para tus recibos. Ninguno los usa para anuncios.",
            "With the business you deal with (your order, your appointment, your ticket), only what it needs to serve you. And with the services that work for To'Latino: Stripe to charge cards, the text message service for your sign-in code, Apple and Google for phone notifications and the email service for your receipts. None of them uses it for ads.")}</p>
        </section>
        <section className={tarjeta} data-screen-label="Privacidad · tus opciones">
          <h2 className={h2}>{E2("Lo que puedes hacer", "What you can do")}</h2>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.55] text-ink/80">
            <li><strong>{E2("Borrar tu cuenta: ", "Delete your account: ")}</strong>{L(I.borrarCuenta)} <a className="font-bold text-action" href="/cuenta/ajustes/borrar">{E2("Borrar mi cuenta", "Delete my account")}</a></li>
            <li>{E2("Apagar cada tipo de aviso en Mi cuenta › Avisos.", "Turn off each type of notification in My account › Notifications.")}</li>
            <li>{E2("Ver y cerrar tus sesiones y tus llaves de acceso en Mi cuenta › Privacidad.", "See and close your sessions and passkeys in My account › Privacy.")}</li>
            <li>{E2("Decir que no a la cámara, la ubicación o los avisos: la app te pide cada permiso solo cuando lo usa.", "Say no to the camera, location or notifications: the app asks for each permission only when it uses it.")}</li>
          </ul>
        </section>
        <section className={tarjeta} data-screen-label="Privacidad · contacto">
          <h2 className={h2}>{E2("¿Preguntas sobre tus datos?", "Questions about your data?")}</h2>
          <p className={p}>{E2("Escríbenos en Soporte y te contesta una persona del equipo.", "Write to us in Support and a person on the team will answer.")} <a className="font-bold text-action" href="/soporte">{E2("Ir a Soporte", "Go to Support")}</a></p>
        </section>
      </div>
    </div>);
}
