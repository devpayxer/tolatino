import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { ENTORNO } from "@/lib/entorno";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import type { Borrador } from "./logica";
import { Publica } from "./Publica";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publica tu negocio · To'Latino" };

/* ONB-NEG-* · Publica tu negocio v2 (diseño «Publica tu negocio v2»). ?paso=A1…F1|H1. */
export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const loc = await ubicacion(u);
  const r = u ? (await db().query<{ step: string; answers: Partial<Borrador>; business_id: string | null; name: string | null; items: number; fotos: number; hasta: string | null; minutos: number | null }>(
    `select o.step, o.answers, o.business_id, b.name,
            coalesce(jsonb_array_length(b.category_attrs->'items'), 0) as items, coalesce(s.photo_count, 0) as fotos,
            to_char((b.category_attrs->'onb'->'trial'->>'until')::timestamptz at time zone 'America/New_York', 'FMDD Mon') as hasta,
            extract(epoch from (o.completed_at - o.started_at))::int / 60 as minutos
       from onboarding_drafts o left join businesses b on b.id = o.business_id left join business_stats_cache s on s.business_id = b.id
      where o.user_id = $1`, [u.id])).rows[0] : null;
  const nombre = u ? { nombre: [u.first_name, u.last_name?.[0] ? `${u.last_name[0]}.` : ""].filter(Boolean).join(" ") || u.nick || "", primero: u.first_name ?? "" } : null;
  const mes = (s: string | null) => (s && lang === "es" ? s.replace(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/, (m) => ({ Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", May: "may", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dic" })[m]!) : s ?? "");
  return (
    <Publica v={{
      lang, ciudad: loc.c.name, ciudadId: loc.ciudad, usuario: nombre, prueba: ENTORNO !== "produccion",
      inicial: r && !r.business_id ? { paso: r.step, d: r.answers } : null,
      publicado: r?.business_id ? { id: r.business_id, nombre: r.name ?? "", minutos: r.minutos ?? 0, hasta: mes(r.hasta), items: r.items, fotos: r.fotos } : null,
    }} />
  );
}
