import "server-only";
import { guardados, horarios, nombresSub, type Resultado } from "./categoria";
import type { Lang } from "./idioma";
import { botonPrincipal, chipsTarjeta, estado, metaTarjeta, resenas, type Tarjeta } from "./tarjeta";

/* Arma las tarjetas de una lista: horario de la semana, nombres de subcategorías y guardados en 3 consultas fijas
   (nunca una por negocio). */
export async function armarTarjetas(ciudad: string, items: Resultado[], lang: Lang, userId: string | null): Promise<Tarjeta[]> {
  const ids = items.map((x) => x.id);
  if (!ids.length) return [];
  const [hor, nom, fav] = await Promise.all([
    horarios(ciudad, ids),
    nombresSub([...new Set(items.flatMap((x) => x.subs.slice(0, 2)))], lang),
    guardados(userId, ids),
  ]);
  return items.map((b) => {
    const tj = (b.attrs.tarjeta ?? {}) as { offer?: { es?: string; en?: string }; status?: { es: string; en: string } };
    const st = estado(hor.porId.get(b.id) ?? [], hor.ahora, b.open, lang, tj.status ?? null, hor.cerrados.has(b.id));
    const btn = botonPrincipal(b.cat, b.pro, b.tags, lang);
    const rv = resenas(b.rating, b.reviews, lang);
    return {
      id: b.id, plan: b.pro ? "pro" : "free", name: b.name, verified: b.verified,
      meta: metaTarjeta(b.cat, b.pro, b.subs.map((s) => nom.get(s) ?? "").filter(Boolean), b.mi, b.radius, b.fromHome, lang),
      rating: rv.rating, reviews: rv.reviews, reviewsNote: rv.note, status: st.text, open: st.open,
      photo: b.photo, chips: chipsTarjeta(b.cat, b.pro, b.tags, b.attrs, lang), offer: b.pro ? tj.offer?.[lang] ?? null : null,
      cta: btn.label, ctaIcon: btn.icon, accion: btn.accion, saved: fav.has(b.id),
      phone: b.phone, lat: b.lat, lng: b.lng,
    };
  });
}
