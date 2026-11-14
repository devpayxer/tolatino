import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { direccionDe, misDirecciones, zonaDe } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import { yoMarco } from "../../yo";
import { Editor } from "./Editor";

export const metadata: Metadata = { title: "Dirección · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-DIRECCION: nueva (/cuenta/direcciones/nueva) o editar una. ?volver= regresa a donde estaba (p. ej. el pago). */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string }> }) {
  const [{ id }, sp, u] = await Promise.all([params, searchParams, yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/cuenta/direcciones/${id}`)}`);
  const es = (await idioma()) === "es";
  const cur = id === "nueva" ? null : await direccionDe(u.id, id);
  if (id !== "nueva" && !cur) notFound();
  const [zona, todas, me, loc] = await Promise.all([zonaDe(u.id), misDirecciones(u.id), yoMarco(u, es), ubicacion(u)]);
  // Solo rutas propias: nunca a otro sitio.
  const volver = typeof sp.volver === "string" && /^\/[a-z0-9/_-]*$/i.test(sp.volver) ? sp.volver : null;
  return <Editor es={es} yo={me} cur={cur} primera={!todas.length} zona={zona} volver={volver} centro={[loc.lat, loc.lng]} />;
}
