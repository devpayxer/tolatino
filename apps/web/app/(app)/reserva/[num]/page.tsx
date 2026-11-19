import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { MomentoAvisos } from "@/app/_cascara/HojaPermiso";
import { idioma } from "@/lib/idioma";
import { esperaDeMesa, type EsperaVista } from "@/lib/mesa-espera";
import { otrosConMesa, rsvDe, rsvHoras, type OtroConMesa } from "@/lib/reservas";
import { ubicacion } from "@/lib/ubicacion";
import { Estado } from "./Estado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu reservación · To'Latino" };

/* APP-NEG-RESERVA-ESTADO (prototipo rsvStVals): la reservación de la persona. Solo la ve quien la hizo. Si no se pudo,
   las horas con mesa de ese día para elegir otra; 9t: «Otros restaurantes con mesa» de su ciudad a esa hora y «Avísame si se libera a esa hora»
   (la lista de espera, lib/mesa-espera.ts). Todo lo decide el servidor. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/reserva/${num}`)}`);
  const r = await rsvDe(u.id, num);
  if (!r) notFound();
  const lost = (r.st === "no" || r.st === "exp") && r.dia >= 0;
  let otras: number[] = [], espera: EsperaVista = { st: "no" }, otros: OtroConMesa[] = [];
  if (lost) {
    const loc = await ubicacion(u);
    [otras, espera, otros] = await Promise.all([
      // «No pudo»: esa hora la negó el restaurante (no se vuelve a ofrecer). «Sin respuesta»: nadie dijo que no; si esa hora tiene mesa, sale.
      rsvHoras(r.negocio.id, r.dia, r.p, "").then((x) => x.grupos.flatMap((g) => g.sl).filter((s) => s.free && (r.st === "exp" || s.h !== r.h)).slice(0, 6).map((s) => s.h)),
      esperaDeMesa(u.id, num),
      otrosConMesa(r.negocio.id, r.ymd, r.h, r.p, { lat: loc.lat, lng: loc.lng, ciudad: loc.ciudad }, lang),
    ]);
  }
  // 8c · El momento útil para ofrecer los avisos en este teléfono (una vez; nunca al abrir la app por primera vez).
  return <><Estado r={r} otras={otras} espera={espera} otros={otros} telefono={u.phone} es={lang === "es"} /><MomentoAvisos es={lang === "es"} /></>;
}
