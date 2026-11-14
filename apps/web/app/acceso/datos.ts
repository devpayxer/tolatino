import "server-only";
import { pantalla } from "@/lib/cms";
import { valores } from "@/lib/config";
import { yo } from "@/lib/cuenta";
import { fechaLanding } from "@/lib/crecimiento/admin";
import { cifrasLanding, miLugar } from "@/lib/crecimiento/lista";
import { db } from "@/lib/db";
import { BASE_URL } from "@/lib/correo";
import type { Lang } from "@/lib/idioma";
import { titulosLegales, type ClaveLegal } from "@/lib/legal";
import { PRECIO_PRO, PRUEBA_DIAS } from "@/lib/plan";
import { FIJAS } from "@/lib/textos-fijas";

/* 9h · Lo que necesita la landing (APP-LANDING-PRE): sus textos del CMS (la base primero, el código de respaldo), las dos líneas fijas de §1c, el lugar en
   la lista de quien ya entró, las cifras sin personas, el precio de Pro del plan y las páginas legales del pie. */
const GRUPO: Record<ClaveLegal, "legal" | "comunidad" | "confianza"> = {
  terminos: "legal", privacidad: "legal", cookies: "legal", ia: "legal", dmca: "legal", accesibilidad: "legal",
  reglas: "comunidad", votos: "comunidad", verificamos: "confianza", seguridad: "confianza", "vivienda-justa": "confianza",
};

/* ¿«/» es la landing? (interruptor growth.landing; nace apagado: se enciende en producción con el OK-1, 9t). Si la base no responde: no. */
export async function landingEncendida(): Promise<boolean> {
  try { return (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'growth.landing'`)).rows[0]?.enabled === true; } catch { return false; }
}

export async function datosLanding(lang: Lang) {
  const u = await yo().catch(() => null);
  const [t, lugar, cifras, cfg, titulos, fecha] = await Promise.all([pantalla("APP-LANDING-PRE", lang), u ? miLugar(u.id) : Promise.resolve(null), cifrasLanding().catch(() => ({ total: 0, negocios: 0, porCiudad: {} })),
    valores("fundadores_negocios", "fundadores_vecinos"), titulosLegales().catch(() => []), fechaLanding().catch(() => ({ visible: false, fecha: null }))]);
  return {
    t, lang, fijas: { landing: FIJAS[lang].landing, landingTel: FIJAS[lang].landingTel }, lugar, conSesion: !!u, total: cifras.total,
    abre: fecha.visible && fecha.fecha ? new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${fecha.fecha}T12:00:00Z`)) : null,
    precio: `$${PRECIO_PRO.toFixed(2)}`, dias: PRUEBA_DIAS, metaNegocios: cfg.fundadores_negocios, url: `${BASE_URL()}/acceso`,
    paginas: titulos.map((x) => ({ k: x.key, t: x.title[lang], g: GRUPO[x.key] })),
  };
}
export type DatosLanding = Awaited<ReturnType<typeof datosLanding>>;
