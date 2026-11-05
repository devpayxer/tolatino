import { abiertoAhora, categorias, HOME_CATS } from "@/lib/directorio";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Inicio } from "./Inicio";

export const dynamic = "force-dynamic";

export default async function Page() {
  const lang = await idioma();
  const [cats, abierto] = await Promise.all([categorias(lang), abiertoAhora("hzl", lang, 4)]);
  const t = T[lang];
  return (
    <Inicio cats={cats} inicio={HOME_CATS} abierto={abierto}
      t={{ allCats: t.allCats, catsTitle: t.catsTitle, openNow: t.openNow, seeAll: t.seeAll, forBiz: t.forBiz, publishTitle: t.publishTitle, publishBody: t.publishBody, publishCta: t.publishCta }} />
  );
}
