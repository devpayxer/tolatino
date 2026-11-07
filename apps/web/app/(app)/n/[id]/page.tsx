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
import { horasApartado, tiendaMia, tiendaVenta } from "@/lib/apartados";
import { reglaPlan } from "@/lib/layaway";
import { mercPublico } from "@/lib/merc-publico";
import { fiestaPublico } from "@/lib/fiestas-publico";
import { diaFiesta } from "@/lib/fiestas-comun";
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
  const [fav, menu, rsv, res, nov, jobs, svc, ofi, tienda, salud, prof, merc, fiesta] = await Promise.all([
    guardados(u?.id ?? null, [f.id]),
    f.cat === "NEG-FOOD" ? menuPublico(f.id, lang, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-FOOD" ? rsvPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    resumenResenas(f.id, u?.id ?? null),
    f.pro ? novedadesFicha(f.id, u?.id ?? null) : Promise.resolve(null),
    f.pro ? vacantesFicha(f.id, u?.id ?? null) : Promise.resolve([]),
    f.cat === "NEG-BELL" ? citasPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" ? oficiosPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Tiendas (4q): lo mismo que la Tienda de Auto y Hogar, con tallas y las horas que guarda la tienda (24/48/72).
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" || f.cat === "NEG-TIENDA" ? Promise.all([tiendaPublica(f.id), tiendaVenta(f.id), tiendaMia(u?.id ?? null, f.id), horasApartado(f.id), f.cat === "NEG-TIENDA" ? reglaPlan(f.id) : null]).then(([L, V, mia, horas, plan]) => ({ L, V, mia, horas, plan })) : Promise.resolve(null),
    // Doctores (4i): servicios con el precio según tu seguro, quién atiende y «Tu seguro».
    f.cat === "NEG-SALUD" ? saludPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Profesionales (4k): el total (honorario + gobierno), la licencia y lo que no puede.
    f.cat === "NEG-PRO" ? proPublico(f.id) : Promise.resolve(null),
    // Mercados (4o): productos por libra, corte o punto, y si toma pedidos.
    f.cat === "NEG-MERC" ? mercPublico(f.id) : Promise.resolve(null),
    // Fiestas (4u): servicios con su forma de cobrar, el calendario real y «Tu fecha».
    f.cat === "NEG-FIESTA" ? fiestaPublico(f.id, u?.id ?? null) : Promise.resolve(null),
  ]);
  // FAQ de Fiestas (neg-fiesta-kind.js faq): la de la fecha y la del depósito salen del calendario y del panel; si el negocio
  // escribió la misma pregunta en Tu página, gana la suya.
  if (fiesta && f.pro) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
    const libres = fiesta.cal.libres.map((d) => diaFiesta(d, es)).join(", ");
    const auto = [
      { q: E2("¿Está libre mi fecha?", "Is my date free?"), a: `${E2("Agrega tu fecha arriba y te lo decimos.", "Add your date above and we tell you.")}${libres ? E2(` Próximas libres: ${libres}.`, ` Next free: ${libres}.`) : ""}` },
      { q: E2("¿Qué pasa con el depósito?", "What about the deposit?"), a: fiesta.dep ? E2(`Se retienen ${usd(fiesta.dep)} al enviar la solicitud y se cobran cuando confirman; se descuentan del total. Si no confirman o proponen otra hora que no aceptas, se libera completo.`, `${usd(fiesta.dep)} is held when you send the request and charged once they confirm; credited to the total. If they do not confirm or propose another time you decline, it is fully released.`) : E2("No pide depósito.", "No deposit.") },
      { q: E2("¿Qué incluye el paquete?", "What does the package include?"), a: E2("Cada paquete dice lo que incluye. Lo que no está escrito, no está incluido.", "Each package lists what it includes. If it is not written, it is not included.") },
      { q: E2("¿Y si cancelo?", "What if I cancel?"), a: E2(`Gratis hasta ${fiesta.cancel} días antes de la fiesta. Después, el depósito se queda con el negocio.`, `Free up to ${fiesta.cancel} days before the party. After that, the business keeps the deposit.`) },
    ];
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
  }
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
      merc={merc}
      fiesta={fiesta}
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
