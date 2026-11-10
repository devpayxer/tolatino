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
  if (!f) notFound();
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
