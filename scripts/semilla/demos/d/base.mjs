// Armado común de cada negocio demo del grupo D (identidad, ficha, equipo, novedades, seguidores) y de sus operaciones.
import { rng, CIUDADES, CITY_IDS, CLIENTES, direccion, phoneNeg, persona, ownerPhone, logoSvg, bi, addDays, withTime, ymd, ANCHOR_D, isFuture, fechasEnvio, textoResena, RESPUESTA_BIEN, RESPUESTA_MAL, uuidOf } from "./comun.mjs";
import { FOTOS } from "./fotos.mjs";

const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DIAS = (d) => Math.floor((ANCHOR_D - d) / 86400000);

/* Negocios: 10 por subcategoría principal, 2 por ciudad. */
export function negociosBase(catKey, catId, SUBS, hooks) {
  const out = []; let gi = 0;
  SUBS.forEach((S, k) => S.names.forEach((name, jx) => {
    const id = `${slug(name)}-${CITY_IDS[(jx + k) % 5]}`, r = rng(`d:${catKey}:${id}`), city = CITY_IDS[(jx + k) % 5];
    const o = persona(r), addr = direccion(r, city), founded = 2008 + ((gi * 7 + jx * 3 + k) % 11);
    const pool = FOTOS[catKey], pics = r.sample(pool, 8);
    const b = { gi, id, r, city, sub: S, subs: [S.id, ...(S.also && r.chance(0.5) ? [S.also] : [])], name, owner: o, ownerPhone: ownerPhone(gi), addr, founded, r0: r.i(1, 9), r1: r.i(0, 9),
      phone: phoneNeg(r, city), whatsapp: r.chance(0.6), email: `contacto@${slug(name)}.example`, instagram: `${slug(name).replace(/-/g, "")}`, gallery: pics.slice(0, 6), pics, logo: logoSvg(name, gi + k), payments: ["local", "app"], jx, k };
    b.stars = r.pick([0.62, 0.7, 0.78, 0.86, 0.9]);
    b.vol = r.f(); // 0..1: tamaño del negocio
    hooks.ficha(b, S, r);
    out.push(b); gi++;
  }));
  return out;
}

/* Preguntas, equipo, seguidores y novedades a partir de plantillas de la categoría. */
export function fichaComun(b, P) {
  const r = rng(`ficha:${b.id}`);
  b.faqs = r.sample(P.faqs, Math.min(P.faqs.length, 5)).map((f) => ({ q: f.q, a: f.a }));
  const roles = r.sample(P.team, r.i(2, Math.min(4, P.team.length)));
  b.team = roles.map((ro, i) => { const p = persona(r); return { name: `${p.first} ${p.last}`, role: ro.role, bio: ro.bio, since: Math.min(2026, b.founded + r.i(0, 8)), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: ro.spec || [] }; });
  const n = r.i(18, 110), cust = r.sample(CLIENTES, n);
  b.follows = cust.map((c) => ({ phone: c.phone, at: addDays(ANCHOR_D, -Math.floor(Math.pow(r.f(), 1.6) * Math.min(3400, DIAS(new Date(Date.UTC(b.founded, 6, 1)))))) })).map((f) => ({ ...f, at: withTime(f.at, r.i(480, 1200)) }));
}

export function novedades(b, P, items, extra = []) {
  const r = rng(`nov:${b.id}`), t = r.sample(P.posts, Math.min(P.posts.length, r.i(6, 9)));
  const posts = []; const recent = [1, 4, 9, 20, 41, 70, 120, 210, 380, 600];
  t.forEach((p, i) => {
    const days = i < 3 ? recent[i] + r.i(0, 2) : Math.floor(Math.pow(r.f(), 0.8) * Math.min(3300, DIAS(new Date(Date.UTC(b.founded + 1, 1, 1))))) + 6;
    const at = withTime(addDays(ANCHOR_D, -days), r.i(540, 1080)), x = { kind: p.kind, title: p.title.slice(0, 60), body: (p.body || "").slice(0, 280), at, pin: i === 0 && p.kind === "novedad" && r.chance(0.3) };
    if (p.kind === "oferta") { const it = items.filter((z) => z.kind === p.slot && z.cents >= 3000)[0] || items.filter((z) => z.cents >= 3000)[0]; if (!it) return; x.item = it.name; x.was = it.cents; x.now = Math.max(1000, Math.round((it.cents * (1 - (p.off || 0.15))) / 500) * 500); if (x.now >= x.was) x.now = x.was - 500; x.ends = days > 30 ? addDays(at, 21) : null; }
    if (p.kind === "encuesta") x.poll = p.poll;
    posts.push(x);
  });
  b.posts = [...posts, ...extra];
}

/* Una operación terminada puede dejar reseña. Devuelve la reseña (o null). */
export function resena(r, P, rubroAns, o, usedUsers) {
  const base = o.done || o.sched; if (!base) return null; const sinceDone = DIAS(base); if (sinceDone < 2) return null;
  const stars = r.weighted([5, 4, 3, 2, 1], [52, 30, 9, 6, 3]), lang = r.chance(0.18) ? "en" : "es";
  const d = Math.min(r.i(1, 9), sinceDone - 1), reply = stars <= 3 || r.chance(0.35);
  const ans = rubroAns(r, stars);
  const txt = textoResena(r, P, stars, lang); const body = txt.length >= 20 ? txt : txt + (lang === "en" ? " Everything was handled with care." : " Todo se manejó con cuidado.");
  const rl = lang;
  return { stars, body: body.slice(0, 900), lang, ans, rec: null, reply: reply ? r.pick(stars >= 4 ? RESPUESTA_BIEN[rl] : RESPUESTA_MAL[rl]) : null, rlang: reply ? rl : null, d, rd: reply ? r.i(0, 3) : 0 };
}

/* Pone `target` reseñas (una por cliente) en operaciones terminadas hace al menos 2 días. */
export function ponerResenas(r, P, rubroAns, opsB, target, esVisita = () => false, rec = (o) => o.item) {
  const elig = r.shuffle(opsB.filter((o) => o.st === "done" && !esVisita(o) && o.done && DIAS(o.done) >= 2)), usados = new Set();
  for (const o of elig) {
    if (usados.size >= target) break;
    if (usados.has(o.ph)) continue;
    const rv = resena(r, P, rubroAns, o, usados);
    if (!rv) continue;
    rv.rec = r.chance(0.5) ? rec(o) : null; o.review = rv; usados.add(o.ph);
  }
}

/* Reparte clientes: cada uno repite lo menos posible; las reseñas nunca repiten cliente en el mismo negocio. */
export function cicloClientes(r) { let q = r.shuffle(CLIENTES), i = 0; return () => { if (i >= q.length) { q = r.shuffle(CLIENTES); i = 0; } return q[i++]; }; }
export { uuidOf };
