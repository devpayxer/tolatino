import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { yo } from "@/lib/cuenta";
import { guardados } from "@/lib/categoria";
import { contexto, evento } from "@/lib/eventos";
import { ficha, registrarVista } from "@/lib/ficha";
import { menuPublico } from "@/lib/pedir";
import { rsvPublica } from "@/lib/reservas";
import { citasPublica } from "@/lib/citas";
import { oficiosPublico } from "@/lib/oficios-publico";
import { saludPublico } from "@/lib/salud-publico";
import { proPublico } from "@/lib/pro-publico";
import { tiendaPublica } from "@/lib/rentas";
import { tiendaMia, tiendaVenta } from "@/lib/apartados";
import { resumenResenas } from "@/lib/resenas";
import { novedadesFicha } from "@/lib/novedades";
import { vacantesFicha } from "@/lib/jobs";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { ubicacion } from "@/lib/ubicacion";
import { Ficha } from "./Ficha";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, lang] = await Promise.all([params, idioma()]);
  const f = await ficha(id, lang);
  return f ? { title: `${f.nombre} · To'Latino`, description: f.subsLinea } : { title: "To'Latino" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; p?: string; d?: string; h?: string; editar?: string }> }) {
  const [{ id }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  const loc = await ubicacion(u);
  const f = await ficha(id, lang, loc);
  if (!f) notFound();
  const [ua, ctx] = [(await headers()).get("user-agent"), await contexto()];
  after(() => registrarVista(f.id, u?.id ?? null, ua).catch(() => undefined));
  after(() => evento("ver_ficha", { ref: f.id, ciudad: loc.c.id, userId: u?.id ?? null }, ctx));
  const [fav, menu, rsv, res, nov, jobs, svc, ofi, tienda, salud, prof] = await Promise.all([
    guardados(u?.id ?? null, [f.id]),
    f.cat === "NEG-FOOD" ? menuPublico(f.id, lang, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-FOOD" ? rsvPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    resumenResenas(f.id, u?.id ?? null),
    f.pro ? novedadesFicha(f.id, u?.id ?? null) : Promise.resolve(null),
    f.pro ? vacantesFicha(f.id, u?.id ?? null) : Promise.resolve([]),
    f.cat === "NEG-BELL" ? citasPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" ? oficiosPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" ? Promise.all([tiendaPublica(f.id), tiendaVenta(f.id), tiendaMia(u?.id ?? null, f.id)]).then(([L, V, mia]) => ({ L, V, mia })) : Promise.resolve(null),
    // Doctores (4i): servicios con el precio según tu seguro, quién atiende y «Tu seguro».
    f.cat === "NEG-SALUD" ? saludPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Profesionales (4k): el total (honorario + gobierno), la licencia y lo que no puede.
    f.cat === "NEG-PRO" ? proPublico(f.id) : Promise.resolve(null),
  ]);
  // Al volver de «Entra» la pestaña conserva personas, día y hora; «Cambiar» trae la solicitud a editar.
  const num = (x?: string) => (x && /^\d{1,4}$/.test(x) ? Number(x) : undefined);
  const rsvInicial = { p: num(sp.p), i: num(sp.d), h: num(sp.h), editar: sp.editar && /^R-\d{1,10}$/.test(sp.editar) ? sp.editar : undefined };
  const t = T[lang].ficha;
  return (
    <Ficha
      f={{ ...f, guardado: fav.has(f.id) }}
      menu={menu}
      rsv={rsv}
      svc={svc}
      ofi={ofi}
      salud={salud}
      prof={prof}
      tienda={tienda}
      resenas={res}
      novedades={nov && nov.posts.length ? nov : null}
      jobs={jobs}
      rsvInicial={rsvInicial}
      sesion={!!u}
      es={lang === "es"}
      tabInicial={sp.tab}
      t={{
        ...t,
        photosAll: f.nFotos === 1 ? t.photosOne : t.photosN.replace("{n}", String(f.nFotos)),
        photoCount: f.nFotos === 1 ? t.photoCountOne : t.photoCount.replace("{n}", String(f.nFotos)),
        relSub: t.relSub.replace("{n}", f.nombre),
      }}
    />
  );
}
