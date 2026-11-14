import { yo } from "@/lib/cuenta";
import { abiertoAhora, categorias, HOME_CATS } from "@/lib/directorio";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "./PantallaPronto";
import { idioma } from "@/lib/idioma";
import { pantalla, textosT } from "@/lib/cms";
import { anunciosVivos, homeConfig } from "@/lib/cms-home";
import { Inicio } from "./Inicio";
import { hoyEnElBarrio } from "@/lib/hoy";
import { oficialDeLaSemana } from "@/lib/comunidad-portada";
import { eventosSemana } from "@/lib/evt-publico";
import { faltaAceptar } from "@/lib/legal";
import { HojaTerminos } from "./HojaTerminos";
import { PieWeb } from "./_legal/PieWeb";
import { datosLanding, landingEncendida } from "@/app/acceso/datos";
import { Landing } from "@/app/acceso/Landing";
import { puntosInicio } from "@/lib/mapa";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo()]);
  // 9h · Producción en acceso anticipado (9t, OK-1): con growth.landing encendido, «/» es la landing (nace apagado; en el sandbox se ve en /acceso).
  if (await landingEncendida()) return <Landing d={await datosLanding(lang)} />;
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  // 5e · Hoy en el barrio (de los negocios, público) y Comunidad (lo de la cuenta oficial de la ciudad; nada de vecinos), con datos reales.
  // 6b · Esta semana: los eventos de los próximos 7 días en el radio (solo lo que sale al público).
  // 9e · La hoja «Aceptar los términos nuevos» sale AQUÍ (la pantalla de inicio, con sesión), nunca encima de una operación en curso.
  // 9f · El Inicio de la ciudad lee el CMS: el aviso y los bloques encendidos (city_home_config), los anuncios vivos y las cadenas (cms_strings, con el
  // código de respaldo). Un bloque apagado ni se consulta. Sin nada editado, sale exactamente como antes.
  const cfg = await homeConfig(loc.c.id), on = (k: string) => cfg.bloques.find((b) => b.key === k)?.on !== false;
  const [cats, abierto, hoy, oficial, semana, faltan, anuncios, h, t] = await Promise.all([categorias(lang), on("abierto") ? abiertoAhora(loc, lang, 4) : Promise.resolve([]),
    on("hoy") ? hoyEnElBarrio(loc.c.id, null, null, loc, 10) : Promise.resolve({ historias: [] }), on("comunidad") ? oficialDeLaSemana(loc.c.id) : Promise.resolve(null),
    on("semana") ? eventosSemana(loc, u?.id ?? null, lang === "es", 6) : Promise.resolve([]), u?.first_name ? faltaAceptar(u.id).catch(() => []) : Promise.resolve([]),
    anunciosVivos(loc.c.id, !!u?.first_name, lang), pantalla("APP-HOME", lang), textosT(lang)]);
  // 9m · El mini mapa de la columna derecha (escritorio, L42): los negocios con pin cerca del punto de quien mira; tocarlo abre el Mapa.
  const puntos = await puntosInicio(loc, 40).catch(() => []);
  return (<>
    <Inicio h={h} bloques={cfg.bloques} aviso={cfg.aviso ? cfg.aviso[lang] : null} anuncios={anuncios} semana={semana} cats={cats} inicio={HOME_CATS} abierto={abierto} es={lang === "es"} hoy={hoy.historias} oficial={oficial} conSesion={!!u?.first_name} lugar={`${loc.c.name.toUpperCase()}, ${loc.c.state}`} mapa={{ centro: [loc.lat, loc.lng], puntos, rad: loc.rad }}
      t={{ allCats: t.allCats, catsTitle: t.catsTitle, openNow: t.openNow, seeAll: t.seeAll, forBiz: t.forBiz, publishTitle: t.publishTitle, publishBody: t.publishBody, publishCta: t.publishCta }} />
    <PieWeb />
    {faltan.length ? <HojaTerminos es={lang === "es"} faltan={faltan} /> : null}
  </>);
}
