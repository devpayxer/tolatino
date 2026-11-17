/* Armado común de un negocio del grupo B: id, ciudad, dueño, dirección con punto en una calle real, teléfono 555-01xx con el código de la ciudad,
   redes, fotos (portada + galería), horario y años en la plataforma. Cada categoría completa lo suyo (equipo, servicios, historia). */
import { CIUDADES, CIUDAD, NOMBRES_M, NOMBRES_F, APELLIDOS, slug, sinTildes, rngDe, fotosDe, conTam, horasFilas } from "./comun.mjs";

let USADOS = new Set();
export const reiniciarIds = () => { USADOS = new Set(); };

/* cat: «NEG-BELL»; si: índice de la subcategoría principal (0–4); k: negocio 0–9 dentro de ella; ord: número 0–199 del grupo (teléfono del dueño). */
export function crear({ cat, sub, si, k, ord, nombre, tipoFotos = 6, fundado, mujer }) {
  const r = rngDe(`b:${cat}:${sub}:${k}`);
  const city = CIUDADES[(k + si) % 5], C = CIUDAD[city];
  let id = slug(`${nombre} ${C.n}`);
  if (USADOS.has(id)) id = `${id}-${k}`;
  USADOS.add(id);
  const [calle, lat0, lng0] = r.pick(C.calles), num = r.int(10, 1890);
  const lat = +(lat0 + (r() - 0.5) * 0.0016).toFixed(6), lng = +(lng0 + (r() - 0.5) * 0.0016).toFixed(6);
  const f = mujer ?? r.chance(0.5), fn = r.pick(f ? NOMBRES_F : NOMBRES_M), ln = r.pick(APELLIDOS), ln2 = r.pick(APELLIDOS);
  const nn = String(r.int(0, 99)).padStart(2, "0");
  const ig = slug(nombre).replace(/-/g, "_").slice(0, 28);
  const fund = fundado ?? r.int(2008, 2018);
  const ownerOrd = 9250 + ord;
  return {
    r, id, city, cityNombre: C.n, cat, subs: [sub], name: nombre, calle, address: `${num} ${calle}, ${C.n} ${C.st}`, lat, lng,
    phone: `+1${C.area}55501${nn}`, wa: r.chance(0.6), email: `contacto@${slug(nombre).slice(0, 30)}.example`, ig, fb: r.chance(0.7) ? slug(nombre).replace(/-/g, "").slice(0, 30) : null,
    founded: fund, proSince: `${Math.max(fund + 1, 2017)}-0${r.int(1, 9)}-1${r.int(0, 8)}`,
    owner: { phone: `+1570555${ownerOrd}`, fn, ln, ln2, email: `${slug(fn)}.${slug(ln)}.${ownerOrd}@demo.example`, f },
    ord,
  };
}

/* Fotos: portada y galería; la primera sirve también de logo. */
export function poner(b, cat, sub, n = 6) {
  const F = fotosDe(cat, sub, b.r, n + 2).map(conTam);
  b.photos = F.slice(0, n);
  b.logo = F[n] ?? F[0];
  return F;
}

export function horario(b, sem) { b.hours = horasFilas(sem); }

/* Un nombre de persona (para el equipo); `f` = mujer. */
export function persona(r, f, evitar = []) {
  let fn, ln, g = 0;
  do { fn = r.pick(f ? NOMBRES_F : NOMBRES_M); ln = r.pick(APELLIDOS); g++; } while (evitar.includes(fn) && g < 20);
  return { fn, ln, nombre: `${fn} ${ln}` };
}

/* Precio de un servicio en esta ciudad y negocio: factor del negocio (0.88–1.22) y de la ciudad; al dólar (o a 5 dólares si es grande). */
export function precio(b, base) {
  const fc = { hzl: 1, wbr: 1, scr: 1.02, alw: 1.1, rdg: 1.04 }[b.city];
  const x = base * (b.factor ?? 1) * fc;
  const paso = x >= 20000 ? 2500 : x >= 5000 ? 500 : 100;
  return Math.max(paso, Math.round(x / paso) * paso);
}

export const bi = (s) => { const [es, en] = s.split(" | "); return { es: es.trim(), en: (en ?? es).trim() }; };
export { sinTildes };

/* Rol en femenino cuando la persona es mujer (solo la parte en español, antes de « | »). */
export function rolGenero(rol, fem) {
  if (!fem) return rol;
  const [es, en] = rol.split(" | ");
  const F = es.replace(/\bBarbero\b/g, "Barbera").replace(/\bdueño\b/g, "dueña").replace(/\bAbogado\b/g, "Abogada").replace(/\bEntrenador\b/g, "Entrenadora").replace(/\bNotario\b/g, "Notaria").replace(/\bMédico\b/g, "Médica")
    .replace(/\bTraductor\b/g, "Traductora").replace(/\bGestor\b/g, "Gestora").replace(/\bInstructor\b/g, "Instructora").replace(/\btitular\b/g, "titular").replace(/\basociado\b/g, "asociada").replace(/\bGinecólogo\b/g, "Ginecóloga").replace(/\bPediatra\b/g, "Pediatra");
  return en ? `${F} | ${en}` : F;
}
