import { yo } from "@/lib/cuenta";
import { abiertoAhora, categorias, HOME_CATS } from "@/lib/directorio";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "./PantallaPronto";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Inicio } from "./Inicio";
import { hoyEnElBarrio } from "@/lib/hoy";
import { oficialDeLaSemana } from "@/lib/comunidad-portada";
import { eventosSemana } from "@/lib/evt-publico";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  // 5e · Hoy en el barrio (de los negocios, público) y Comunidad (lo de la cuenta oficial de la ciudad; nada de vecinos), con datos reales.
  // 6b · Esta semana: los eventos de los próximos 7 días en el radio (solo lo que sale al público).
  const [cats, abierto, hoy, oficial, semana] = await Promise.all([categorias(lang), abiertoAhora(loc, lang, 4), hoyEnElBarrio(loc.c.id, null, null, loc, 10), oficialDeLaSemana(loc.c.id), eventosSemana(loc, u?.id ?? null, lang === "es", 6)]);
  const t = T[lang];
  return (
    <Inicio semana={semana} cats={cats} inicio={HOME_CATS} abierto={abierto} es={lang === "es"} hoy={hoy.historias} oficial={oficial} conSesion={!!u?.first_name} lugar={`${loc.c.name.toUpperCase()}, ${loc.c.state}`}
      t={{ allCats: t.allCats, catsTitle: t.catsTitle, openNow: t.openNow, seeAll: t.seeAll, forBiz: t.forBiz, publishTitle: t.publishTitle, publishBody: t.publishBody, publishCta: t.publishCta }} />
  );
}
