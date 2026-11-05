import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { categorias } from "@/lib/directorio";
import { conteos, destacados, nuevos } from "@/lib/categoria";
import { armarTarjetas } from "@/lib/tarjetas";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../PantallaPronto";
import { Negocios } from "./Negocios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Negocios · To'Latino" };

/* APP-NEG-HOME. «Hoy en el barrio» (novedades) y «Recomendados por vecinos» no salen hasta tener datos reales:
   las novedades llegan con su módulo y las recomendaciones con las reseñas (el prototipo las inventaba). */
export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const t = T[lang];
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const CIUDAD = loc.ciudad, ciudad = loc.c;
  const [cats, n, dest, nue, lineas] = await Promise.all([
    categorias(lang), conteos(loc), destacados(loc, 6), nuevos(loc, 6),
    db().query<{ id: string; l: string | null }>("select id, page->'subs_line'->>$1 as l from categories", [lang]).then((r) => new Map(r.rows.map((x) => [x.id, x.l]))),
  ]);
  const [tDest, tNue] = await Promise.all([armarTarjetas(CIUDAD, dest, lang, u?.id ?? null), armarTarjetas(CIUDAD, nue, lang, u?.id ?? null)]);
  const c = ciudad?.name ?? "", l = ciudad ? `${ciudad.name.toUpperCase()}, ${ciudad.state}` : "";
  const I = t.intents;
  return (
    <Negocios
      titulo={t.negTitle.replace("{c}", c)}
      sub={t.negSub.replace("{l}", l)}
      intenciones={[
        { l: I.abierto, icon: "clock", href: "/abierto" },
        { l: I.delivery, icon: "truck", href: "/c/comida?f=delivery" },
        { l: I.verificados, icon: "shield", href: "/buscar?f=verified" },
        { l: I.cita, icon: "calendar", href: "/buscar?f=cita" },
        { l: I.domicilio, icon: "home", href: "/buscar?f=domicilio" },
        { l: I.pago, icon: "card", href: "/buscar?f=online" },
      ]}
      cats={cats.map((x) => ({ ...x, n: n.get(x.id) ?? 0, linea: lineas.get(x.id) ?? "" }))}
      destacados={tDest}
      nuevos={tNue}
      t={{
        cats: t.catsSec, dest: t.featTitle.replace("{c}", c), nuevos: t.freshTitle, hoy: t.todayTag, llamar: t.call,
        forBiz: t.forBiz, publishTitle: t.publishTitle, publishBody: t.publishBody, publishCta: t.publishCta,
      }}
    />
  );
}
