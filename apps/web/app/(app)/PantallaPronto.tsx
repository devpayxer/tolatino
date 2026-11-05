import { ciudades, miCiudad, pronto } from "@/lib/ciudad";
import type { Lang } from "@/lib/idioma";
import type { Ubicacion } from "@/lib/ubicacion";
import { CiudadPronto } from "./CiudadPronto";

/* Inicio, Negocios, categorías, Buscar, Abierto ahora y Mapa muestran APP-CIUDAD-PRONTO cuando la ciudad que estás
   viendo todavía no abre (prototipo isPronto). */
export async function PantallaPronto({ loc, lang, userId }: { loc: Ubicacion; lang: Lang; userId: string | null }) {
  const [p, mi] = await Promise.all([pronto(loc.c, userId), ciudades().then((cs) => miCiudad(userId, cs))]);
  return <CiudadPronto p={p} lang={lang} miCiudad={mi.n} />;
}
