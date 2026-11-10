import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { yo } from "@/lib/cuenta";
import { contexto, evento } from "@/lib/eventos";
import { fichaEvento } from "@/lib/evt-publico";
import { idioma } from "@/lib/idioma";
import { BASE_URL } from "@/lib/correo/index";
import { ubicacion } from "@/lib/ubicacion";
import { FichaEvento } from "./FichaEvento";
import { diaCorto as diaCortoSrv, hora as horaSrv } from "@/lib/evt-comun";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ fecha?: string }> };

/* SEO de la ficha pública (los eventos sí se indexan): título, descripción, la imagen del cartel y el enlace canónico de la fecha. */
export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const [{ slug }, sp, lang] = await Promise.all([params, searchParams, idioma()]);
  const f = await fichaEvento(slug, sp.fecha ?? null, null, null, lang === "es");
  if (!f) return { title: "To'Latino" };
  const d = `${f.dia} · ${f.venue}${f.desc ? ` · ${f.desc.slice(0, 140)}` : ""}`;
  return { title: `${f.title} · To'Latino`, description: d, alternates: { canonical: `${BASE_URL()}${f.href}` },
    openGraph: { title: f.title, description: d, type: "website", url: `${BASE_URL()}${f.href}`, ...(f.img ? { images: [{ url: f.img }] } : {}) } };
}

/* APP-EVT-LISTING (prototipo lsVals L1205): la ficha del evento, oscura para fiesta o show y clara para los demás (el formato lo dice). */
export default async function Page({ params, searchParams }: P) {
  const [{ slug }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  const f = await fichaEvento(slug, sp.fecha ?? null, u?.id ?? null, loc, lang === "es");
  if (!f) {
    // 6e · Un evento cancelado ya no sale en Eventos, pero su enlace (el del SMS o el que alguien guardó) dice que se canceló y qué pasa con el dinero.
    const cx = await (await import("@/lib/evt-cambios")).fichaCancelada(slug, lang === "es");
    if (!cx) notFound();
    return <EventoCancelado x={cx} es={lang === "es"} />;
  }
  const ctx = await contexto();
  after(() => evento("ver_evento", { ref: f.id, ciudad: loc.c.id, userId: u?.id ?? null }, ctx));
  // schema.org/Event: lo que dice la ficha, sin datos de nadie.
  const ld = {
    "@context": "https://schema.org", "@type": "Event", name: f.title, ...(f.desc ? { description: f.desc } : {}), startDate: f.seo.start, endDate: f.seo.end,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", url: `${BASE_URL()}${f.href}`,
    ...(f.img ? { image: [f.img] } : {}),
    location: { "@type": "Place", name: f.venue, address: { "@type": "PostalAddress", ...(f.seo.addr ? { streetAddress: f.seo.addr } : {}), addressLocality: f.ciudad, addressRegion: f.estado, addressCountry: "US" } },
    organizer: { "@type": "Organization", name: f.org.name, url: `${BASE_URL()}/n/${f.org.id}` },
    ...(f.free ? { isAccessibleForFree: true } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <FichaEvento f={f} es={lang === "es"} conSesion={!!u} />
    </>
  );
}

/* 6e · Ficha de un evento cancelado (lsVals: «Evento cancelado» · «Si compraste, te devolvemos todo en 3–5 días hábiles. No tienes que hacer
   nada.»). Hueco compuesto con las piezas de la ficha y de la orden (cartel, título, aviso de estado). Sin datos de nadie; no se indexa. */
function EventoCancelado({ x, es }: { x: { title: string; org: string; dia: string; h0: number; motivo: string; tix: boolean; img: string | null }; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  return (
    <div data-pantalla="APP-EVT-LISTING" data-screen-label="Ficha del evento · cancelado" className="min-h-[100dvh] bg-paper">
      <div className="mx-auto max-w-[720px] px-4 pb-12 pt-5 lg:px-[30px] lg:pt-8">
        <a href="/eventos" className="text-[13px] font-bold text-action">{E2("Eventos", "Events")}</a>
        {x.img && <div role="img" aria-label={x.title} className="mt-3 h-[180px] rounded-[18px] bg-cover bg-center opacity-60 grayscale lg:h-[260px]" style={{ backgroundImage: `url("${x.img}")` }} />}
        <div className="mt-4 font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{`${x.org.toUpperCase()} · ${diaCortoSrv(x.dia, es).toUpperCase()} · ${horaSrv(x.h0)}`}</div>
        <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink/60 line-through lg:text-[32px]">{x.title}</h1>
        <div role="alert" className="mt-4 rounded-[14px] bg-danger/[.1] px-4 py-3.5">
          <div className="text-[14px] font-extrabold text-danger">{E2("Evento cancelado", "Event cancelled")}</div>
          <div className="mt-1 text-[13px] font-semibold leading-[1.5] text-ink/75">{`${x.motivo}. ${x.tix ? E2("Si compraste, te devolvemos todo en 3–5 días hábiles. No tienes que hacer nada.", "If you bought, you get everything back in 3–5 business days. Nothing to do.") : E2("Si ibas, no tienes que hacer nada.", "If you were going, nothing to do.")}`}</div>
        </div>
        <a href="/eventos" className="mt-5 inline-flex h-11 items-center rounded-[14px] bg-ink px-5 text-[14px] font-bold text-white">{E2("Ver otros eventos", "See other events")}</a>
      </div>
    </div>
  );
}
