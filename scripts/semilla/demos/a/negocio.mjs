/* Grupo A · arma el objeto «negocio» común (lo que lee bloqueNegocio) y la historia compartida: seguidores, novedades y reseñas. */
import { rng, dueno, direccion, telefonoNegocio, photoUrl, logoUrl, slug, bi, CIUDAD_IDS, CIUDADES, hash } from "./comun.mjs";

let N_GLOBAL = 0;
export const siguiente = () => N_GLOBAL++;
export const reiniciar = (n = 0) => { N_GLOBAL = n; };

export const IDS = new Set();

/* spec: { n (índice global 0..199), cat, name, subs, city, founded, about, attrs, filter, mods, amenities, hours, photoIds[], faqs, role{es,en}, bio, team[], whatsapp, langs } */
export function armar(spec) {
  const r = rng(`neg:${spec.cat}:${spec.name}`);
  const id = slug(spec.name);
  if (IDS.has(id)) throw new Error("id repetido " + id);
  IDS.add(id);
  const fem = spec.fem ?? r.chance(0.5);
  const own = dueno(spec.n, fem);
  const addr = direccion(r, spec.city, spec.street);
  const ig = slug(spec.name).replace(/-/g, "").slice(0, 24) + (r.chance(0.4) ? "_" + spec.city : "");
  return {
    id, n: spec.n, name: spec.name, city: spec.city, cat: spec.cat, subs: spec.subs, addr, phone: telefonoNegocio(r, spec.city), whatsapp: spec.whatsapp ?? r.chance(0.55),
    instagram: ig, facebook: slug(spec.name).replace(/-/g, ".").slice(0, 28), languages: spec.langs ?? (r.chance(0.55) ? ["es", "en"] : ["es"]), about: spec.about, founded: spec.founded,
    amenities: spec.amenities, filter: spec.filter, payModes: spec.payModes ?? ["local", "online"], attrs: spec.attrs, logo: logoUrl(spec.photoIds[0]), mods: spec.mods,
    hours: spec.hours, photos: spec.photoIds.map((p) => photoUrl(p)), faqs: spec.faqs, bank: String(1000 + (hash(id) % 9000)),
    owner: { phone: own.phone, first: own.first, last: `${own.last} ${own.last2}`, role: spec.role, bio: spec.bio }, team: spec.team ?? [],
    proDias: 70 + (hash(id) % 330), proFin: 3 + (hash(id + "p") % 24),
    fol: { st: hash(id + "f") % 247, n: spec.followers ?? r.int(18, 140), stp: [2, 3, 5, 7, 11, 17, 23, 29, 31, 37][hash(id + "s") % 10] },
    r,
  };
}

/* Reparto de ciudades: 10 negocios por subcategoría, 2 por ciudad, rotado por subcategoría para que la categoría salga pareja. */
export const ciudadDe = (subIdx, k) => CIUDAD_IDS[(k + subIdx) % 5];
export const anioFundado = (r) => r.int(2008, 2018);

/* Un trozo repetible de «hace cuántos días» (más reciente = más volumen), limitado por los años del negocio. */
export function dias(r, maxDias) {
  const u = r();
  if (u < 0.34) return r.int(0, Math.min(364, maxDias));
  if (u < 0.6) return r.int(365, Math.min(729, maxDias));
  return r.int(Math.min(730, maxDias), maxDias);
}
export const maxDiasDe = (founded) => Math.min(3650, (2026 - founded) * 365 + 120);

/* Ritmo de la hora del día: lista de [minutoDelDía, peso]. */
export function hora(r, franjas) { const f = r.weighted(franjas.map((x) => [x, x[2]])); return r.int(f[0], f[1]); }

/* Seguidores: la ventana sobre los clientes; se ajusta en el SQL. */
export const seguidoresSql = (b) => `select pg_temp.da_follows(${JSON.stringify(b.id).replace(/"/g, "'")}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000);`;

/* Reparto de estrellas con muchas 4–5 y algunas 2–3 (y casi nunca 1). */
export function estrellas(r) { return r.weighted([[5, 52], [4, 33], [3, 8], [2, 5], [1, 2]]); }

export const bodyOf = (t) => t;
export { bi };
