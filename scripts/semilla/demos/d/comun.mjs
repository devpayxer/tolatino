// Piezas comunes del grupo D (Fiestas, Transporte, Educación, Niños, Iglesias). Solo SANDBOX.
// Todo es determinista: la misma salida cada vez (PRNG con semilla por texto).
import { createHash } from "node:crypto";

export const ANCHOR = "2026-11-17"; // «hoy» del generador; lo próximo se emite relativo a current_date
export const TZ = "America/New_York";

/* ── PRNG ── */
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) {
  let a = hash32(String(seed)) || 1;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = { f, i: (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)), chance: (p) => f() < p, pick: (arr) => arr[Math.floor(f() * arr.length)],
    shuffle: (arr) => { const x = [...arr]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; },
    sample: (arr, n) => r.shuffle(arr).slice(0, n), weighted: (arr, w) => { let t = w.reduce((a, b) => a + b, 0) * f(); for (let i = 0; i < arr.length; i++) { t -= w[i]; if (t <= 0) return arr[i]; } return arr[arr.length - 1]; } };
  return r;
}
export const uuidOf = (k) => { const h = createHash("md5").update(k).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; };

/* ── SQL ── */
export const s = (v) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
export const n = (v) => (v == null ? "null" : String(Math.round(v)));
export const j = (o) => (o == null ? "null" : s(JSON.stringify(o)) + "::jsonb");
export const arr = (a, t = "text") => `array[${a.map(s).join(",")}]::${t}[]`;
export const bi = (es, en) => ({ es, en });
export const usd = (c) => "$" + (c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

/* ── Fechas (hora local de la ciudad; todo es America/New_York) ── */
const D0 = Date.parse(ANCHOR + "T12:00:00Z");
export const addDays = (d, k) => new Date(d.getTime() + k * 86400000);
export const toDate = (str) => new Date(str.slice(0, 10) + "T" + (str.length > 10 ? str.slice(11, 16) : "12:00") + ":00Z");
export const ymd = (d) => d.toISOString().slice(0, 10);
export const ANCHOR_D = new Date(D0);
const pad = (x) => String(x).padStart(2, "0");
/* Una marca local: lo pasado va en texto; lo futuro relativo a current_date (se vuelve a ver «próximo» al aplicar). */
export function ts(d) {
  if (d == null) return "null";
  const dayK = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.parse(ANCHOR + "T00:00:00Z")) / 86400000);
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  if (dayK > 0) return `(current_date + ${dayK} + interval '${hm}')`;
  return `'${ymd(d)} ${hm}'::timestamp`;
}
export const dateLit = (d) => { const k = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.parse(ANCHOR + "T00:00:00Z")) / 86400000); return k > 0 ? `(current_date + ${k})` : `'${ymd(d)}'::date`; };
export const withTime = (d, min) => { const x = new Date(d.getTime()); x.setUTCHours(Math.floor(min / 60), min % 60, 0, 0); return x; };
export const isFuture = (d) => d.getTime() > Date.parse(ANCHOR + "T23:59:59Z");

/* ── Ciudades: calles reales con su punto aproximado (lat, lng) ── */
export const CIUDADES = {
  hzl: { n: "Hazleton", area: "570", st: [["N Wyoming St", 40.9594, -75.9742], ["E Broad St", 40.9587, -75.9708], ["W Broad St", 40.9582, -75.9790], ["N Church St", 40.9610, -75.9750], ["Alter St", 40.9560, -75.9715], ["N Laurel St", 40.9620, -75.9771], ["W Diamond Ave", 40.9573, -75.9812], ["S Wyoming St", 40.9540, -75.9742], ["W 9th St", 40.9536, -75.9817]] },
  alw: { n: "Allentown", area: "610", st: [["W Hamilton St", 40.6023, -75.4760], ["E Hamilton St", 40.6024, -75.4650], ["N 7th St", 40.6068, -75.4690], ["W Linden St", 40.5993, -75.4730], ["Tilghman St", 40.6090, -75.4780], ["S 4th St", 40.5995, -75.4670], ["Liberty St", 40.6140, -75.4760], ["Union St", 40.5985, -75.4730], ["N 10th St", 40.6100, -75.4740]] },
  wbr: { n: "Wilkes-Barre", area: "570", st: [["S Main St", 41.2410, -75.8830], ["N Main St", 41.2490, -75.8830], ["E Market St", 41.2455, -75.8770], ["Kidder St", 41.2395, -75.8790], ["S Franklin St", 41.2400, -75.8850], ["Carey Ave", 41.2540, -75.8960], ["N Washington St", 41.2480, -75.8790], ["Hazle Ave", 41.2385, -75.8690], ["W Northampton St", 41.2430, -75.8860]] },
  scr: { n: "Scranton", area: "570", st: [["Lackawanna Ave", 41.4085, -75.6640], ["Wyoming Ave", 41.4080, -75.6620], ["N Washington Ave", 41.4130, -75.6600], ["Adams Ave", 41.4100, -75.6600], ["Cedar Ave", 41.4000, -75.6600], ["Linden St", 41.4075, -75.6610], ["Prospect Ave", 41.4180, -75.6680], ["N Main Ave", 41.4180, -75.6720], ["S Main Ave", 41.3960, -75.6770]] },
  rdg: { n: "Reading", area: "610", st: [["Penn St", 40.3356, -75.9270], ["N 5th St", 40.3400, -75.9260], ["N 9th St", 40.3430, -75.9240], ["Perkiomen Ave", 40.3420, -75.9100], ["Bingaman St", 40.3290, -75.9300], ["Court St", 40.3370, -75.9310], ["N 11th St", 40.3450, -75.9220], ["Schuylkill Ave", 40.3300, -75.9380], ["Centre Ave", 40.3480, -75.9380]] },
};
export const CITY_IDS = ["hzl", "alw", "wbr", "scr", "rdg"];
export const ZIP = { hzl: "18201", alw: "18102", wbr: "18702", scr: "18503", rdg: "19601" };
export const STATE = "PA";
export function direccion(r, city) { const st = r.pick(CIUDADES[city].st), num = r.i(2, 9) * 100 + r.i(1, 98), jl = () => (r.f() - 0.5) * 0.0016;
  return { text: `${num} ${st[0]}, ${CIUDADES[city].n} PA`, lat: +(st[1] + jl()).toFixed(6), lng: +(st[2] + jl()).toFixed(6) }; }
export const phoneNeg = (r, city) => `+1${CIUDADES[city].area}55501${String(r.i(0, 99)).padStart(2, "0")}`;

/* ── Personas de ficción ── */
export const NOMBRES_F = ["Rosa", "Marisol", "Yesenia", "Luz", "Carmen", "Dilcia", "Altagracia", "Griselda", "Noemí", "Aracely", "Ingrid", "Fabiola", "Lourdes", "Maribel", "Yadira", "Esperanza", "Josefina", "Mireya", "Nelly", "Odalys", "Paola", "Rocío", "Sandra", "Tatiana", "Ximena", "Wendy", "Zoila", "Belkis", "Cristina", "Damaris"];
export const NOMBRES_M = ["Rafael", "Omar", "Wilfredo", "Néstor", "Jesús", "Ramón", "Hugo", "Edwin", "Alexis", "Gerardo", "Julio", "Ismael", "Moisés", "Nelson", "Orlando", "Pablo", "Quirino", "Ricardo", "Santiago", "Tomás", "Ulises", "Víctor", "Wálter", "Yamil", "Abel", "Bernardo", "Cipriano", "Darío", "Elías", "Fidel"];
export const APELLIDOS = ["Almonte", "Batista", "Cabrera", "Durán", "Espinal", "Féliz", "Guzmán", "Henríquez", "Infante", "Jiménez", "Lantigua", "Mejía", "Núñez", "Ortiz", "Peralta", "Quezada", "Reyes", "Sención", "Tavárez", "Urbáez", "Valdez", "Zapata", "Arroyo", "Benítez", "Colón", "Domínguez", "Escobar", "Figueroa", "Galarza", "Hidalgo", "Irizarry", "Jaramillo", "Lugo", "Maldonado", "Narváez", "Olivo", "Pagán", "Quiñones", "Rivas", "Soto", "Torres", "Vélez", "Zayas", "Acevedo", "Barrios", "Cordero", "Delgado", "Estrada", "Frías", "Gómez"];
export const persona = (r) => { const f = r.chance(0.5); return { first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), f }; };

/* Clientes del grupo D: 245 teléfonos ficticios 570-555-8750…8999 (sin los 5 que ya usan otras pruebas). */
const OCUPADOS = new Set([8767, 8798, 8821, 8875, 8896]);
export const CLIENTES = []; { const r = rng("clientes-d"); for (let k = 8750; k <= 8999; k++) { if (OCUPADOS.has(k)) continue; const f = r.chance(0.55); CLIENTES.push({ phone: `+1570555${k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); } }
export const ownerPhone = (i) => `+1570555${9750 + i}`;

/* ── Línea de tiempo: más reciente = más operaciones ── */
export function fechasEnvio(r, cnt, desdeAnio, tope = 1) {
  const out = []; const y0 = desdeAnio, y1 = 2026; const w = []; for (let y = y0; y <= y1; y++) w.push(Math.pow(y - y0 + 1.4, 1.7) * (y === 2026 ? 0.85 : 1));
  const yrs = []; for (let y = y0; y <= y1; y++) yrs.push(y);
  for (let k = 0; k < cnt; k++) { const y = r.weighted(yrs, w); const endDay = y === 2026 ? Math.floor((D0 - Date.UTC(2026, 0, 1)) / 86400000) - tope : 364; const dd = r.i(0, Math.max(0, endDay)); out.push(new Date(Date.UTC(y, 0, 1 + dd, r.i(8, 20), r.pick([0, 15, 30, 45]))));
  }
  return out.sort((a, b) => a - b);
}

/* ── Horarios ── */
export function horario(pat) { // pat: [[dow0..6 -> [ [ini,fin] ] | null]]
  return pat.map((rg, d) => ({ d, open: !!rg, ranges: rg || [] }));
}
export const H = {
  lunSab: (a, b) => [null, [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]]],
  lunSabCorto: (a, b, a2, b2) => [null, [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a2, b2]]],
  todos: (a, b) => [[[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]]],
  lunVie: (a, b) => [null, [[a, b]], [[a, b]], [[a, b]], [[a, b]], [[a, b]], null],
};

/* ── Logo: monograma en SVG (sin foto, sin emoji) ── */
const COLORES = ["#1f5f4a", "#8a3b2a", "#2a4d8a", "#6b3a7a", "#9a6a12", "#256a72", "#7a2f46", "#3d5a2a"];
export function logoSvg(name, k) { const ini = name.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w) && w.length > 2).slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2).toUpperCase();
  const c = COLORES[k % COLORES.length]; const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='36' fill='${c}'/><text x='100' y='128' font-family='Georgia,serif' font-size='84' font-weight='700' text-anchor='middle' fill='#fff'>${ini}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/%20/g, " ").replace(/'/g, "%27"); }

/* ── Texto de reseñas: dos o tres frases por reseña, según estrellas ── */
export function textoResena(r, P, stars, lang) {
  const L = lang === "en" ? "en" : "es"; const pool = stars >= 4 ? P.pos : stars === 3 ? P.mid : P.neg;
  const a = r.pick(pool[L]); let b = r.pick(pool[L]); let g = 0; while (b === a && g++ < 5) b = r.pick(pool[L]);
  const cierre = stars >= 4 ? r.pick(P.cierre[L]) : stars === 3 ? "" : r.pick(P.cierreNeg[L]);
  return [a, r.chance(0.8) ? b : "", r.chance(0.6) ? cierre : ""].filter(Boolean).join(" ");
}
export const RESPUESTA_BIEN = { es: ["Gracias por tu confianza. Aquí estamos para lo que necesites.", "Muchas gracias por escribirnos, nos alegra que todo saliera bien.", "Qué bueno saberlo. Gracias por elegirnos y por recomendarnos.", "Gracias de parte de todo el equipo. Te esperamos de nuevo.", "Nos da mucho gusto. Gracias por tomarte el tiempo de contarlo."],
  en: ["Thank you for trusting us. We are here for whatever you need.", "Thanks for writing, we are glad everything went well.", "So glad to hear it. Thank you for choosing us and recommending us.", "Thanks from the whole team. We look forward to seeing you again."] };
export const RESPUESTA_MAL = { es: ["Lamentamos que no fuera lo que esperabas. Ya hablamos con el equipo para corregirlo; escríbenos y lo resolvemos.", "Gracias por avisarnos. Tienes razón en parte y estamos ajustando el proceso. Llámanos y lo arreglamos.", "Sentimos la molestia. Queremos corregirlo: pásanos tu número de solicitud por mensaje y lo revisamos hoy.", "Gracias por la franqueza. Tomamos nota y vamos a mejorar; nos gustaría darte otra oportunidad."],
  en: ["We are sorry it was not what you expected. We spoke with the team to fix it; message us and we will make it right.", "Thank you for telling us. You are partly right and we are adjusting. Call us and we will sort it out.", "Sorry for the trouble. Send us your request number by message and we will review it today.", "Thanks for being straight with us. We took note and will improve; we would like another chance."] };

/* ── Núcleo de emisión: lo común a las cinco categorías ── */
export function sqlComun(cat, negocios, ops, extra, after = []) {
  const out = [];
  const P = (x) => out.push(x);
  P(`-- Negocios demo del grupo D · ${cat}. Generado por scripts/semilla/demos/grupo-d.mjs. SOLO SANDBOX. No editar a mano.`);
  P(`-- Idempotente: llaves fijas, on conflict / not exists. Nada se borra.`);
  P("begin;");
  /* usuarios: dueños y clientes */
  const us = []; for (const b of negocios) us.push(`(${s(b.ownerPhone)}, now(), ${s(b.owner.first)}, ${s(b.owner.last)}, 'es', ${s(b.city)}, ${s("dueno-" + b.id + "@demo.example")}, true)`);
  P(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id, email, email_verified) values\n${us.join(",\n")}\non conflict (phone) do nothing;`);
  const cs = CLIENTES.map((c) => `(${s(c.phone)}, now(), ${s(c.first)}, ${s(c.last)}, 'es', ${s(c.city)})`);
  P(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${cs.join(",\n")}\non conflict (phone) do nothing;`);
  /* negocio */
  for (const b of negocios) {
    P(`insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, works_from_home, service_radius_mi, phone, whatsapp, email, instagram, languages, about, founded_year, amenities, filter_values, payment_modes, category_attrs, logo_url, modules_on, is_demo, owner_user_id, created_at)
values (${s(b.id)}, ${s(b.city)}, ${s(cat)}, ${arr(b.subs)}, ${s(b.name)}, 'active', 'self', ${s(b.addr.text)}, st_geogfromtext('POINT(${b.addr.lng} ${b.addr.lat})'), ${b.fromHome ? "true" : "false"}, ${n(b.radius)}, ${s(b.phone)}, ${b.whatsapp ? "true" : "false"}, ${s(b.email)}, ${s(b.instagram)}, ${arr(b.languages)}, ${j(b.about)}, ${b.founded}, ${arr(b.amenities)}, ${arr(b.filters)}, ${arr(b.payments)}, ${j(b.attrs)}, ${s(b.logo)}, ${arr(b.modules)}, true, (select id from users where phone = ${s(b.ownerPhone)}), '${b.founded}-0${b.r0}-1${b.r1} 10:00+00')
on conflict (id) do update set name = excluded.name, subcategory_ids = excluded.subcategory_ids, address = excluded.address, geo = excluded.geo, phone = excluded.phone, whatsapp = excluded.whatsapp, email = excluded.email,
  instagram = excluded.instagram, languages = excluded.languages, about = excluded.about, founded_year = excluded.founded_year, amenities = excluded.amenities, filter_values = excluded.filter_values,
  payment_modes = excluded.payment_modes, category_attrs = excluded.category_attrs, logo_url = excluded.logo_url, modules_on = excluded.modules_on, service_radius_mi = excluded.service_radius_mi,
  works_from_home = excluded.works_from_home, owner_user_id = excluded.owner_user_id, status = 'active', updated_at = now() where businesses.is_demo;`);
  }
  /* Pro, cuenta de cobro simulada, dueño del panel */
  P(`insert into subscriptions (business_id, status, cycle, price_cents, trial_choice, payer_user_id, current_period_end, trial_started_at, trial_ends_at, created_at)
select b.id, 'active', 'month', 1499, 'card', b.owner_user_id, now() + (interval '1 day' * (1 + (abs(hashtext(b.id)) % 27))), b.created_at, b.created_at + interval '30 days', b.created_at from businesses b where b.id in (${negocios.map((b) => s(b.id)).join(",")}) on conflict (business_id) do nothing;`);
  P(`insert into subscription_events (business_id, kind, amount_cents, note, idem_key, at)
select b.id, 'pro_started', 1499, '{"es":"Plan Pro activo","en":"Pro plan active"}'::jsonb, 'demo-d-pro-' || b.id, b.created_at + interval '30 days' from businesses b where b.id in (${negocios.map((b) => s(b.id)).join(",")}) on conflict (idem_key) do nothing;`);
  P(`insert into business_stats_cache (business_id, plan, verified, photo_count) select b.id, 'pro', true, 6 from businesses b where b.id in (${negocios.map((b) => s(b.id)).join(",")})
on conflict (business_id) do update set plan = 'pro', verified = true, photo_count = 6, updated_at = now();`);
  P(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
select b.id, 'acct_sim_' || b.id, 'enabled', true, true, '[]'::jsonb, lpad((abs(hashtext(b.id)) % 10000)::text, 4, '0'), true from businesses b where b.id in (${negocios.map((b) => s(b.id)).join(",")}) on conflict (business_id) do nothing;`);
  /* horario, fotos, preguntas, equipo, licencias */
  P(`create temp table _h (b text, wd int, o boolean, r jsonb) on commit drop;`);
  P(`insert into _h values\n${negocios.flatMap((b) => b.hours.map((h) => `(${s(b.id)}, ${h.d}, ${h.open}, ${j(h.ranges)})`)).join(",\n")};`);
  P(`insert into business_hours (business_id, weekday, open, ranges) select b, wd, o, r from _h where not exists (select 1 from business_hours x where x.business_id = _h.b) on conflict do nothing;`);
  P(`create temp table _m (b text, k int, url text, kind text, owner text) on commit drop;`);
  P(`insert into _m values\n${negocios.flatMap((b) => b.gallery.map((u, k) => `(${s(b.id)}, ${k}, ${s(u)}, 'business', ${s(b.id)})`).concat([`(${s(b.id)}, 0, ${s(b.logo)}, 'logo', ${s(b.id)})`])).join(",\n")};`);
  P(`insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('demod:' || b || ':' || kind || ':' || k)::uuid, kind, owner, url, case when kind = 'logo' then null else 'Pexels' end, k, case when kind = 'logo' then (select owner_user_id from businesses where id = _m.b) end from _m on conflict (id) do nothing;`);
  P(`create temp table _q (b text, k int, q jsonb, a jsonb) on commit drop;`);
  P(`insert into _q values\n${negocios.flatMap((b) => b.faqs.map((f, k) => `(${s(b.id)}, ${k}, ${j(f.q)}, ${j(f.a)})`)).join(",\n")};`);
  P(`insert into faqs (business_id, question, answer, sort) select b, q, a, k from _q where not exists (select 1 from faqs f where f.business_id = _q.b);`);
  P(`create temp table _t (b text, nm text, role jsonb, since int, k int, bio jsonb, langs text[], spec jsonb) on commit drop;`);
  P(`insert into _t values\n${negocios.flatMap((b) => b.team.map((m, k) => `(${s(b.id)}, ${s(m.name)}, ${j(m.role)}, ${m.since}, ${k + 1}, ${j(m.bio)}, ${arr(m.langs || ["es"])}, ${j(m.spec || [])})`).concat([`(${s(b.id)}, ${s(b.owner.first + " " + b.owner.last)}, ${j(b.owner.f ? bi("Dueña", "Owner") : bi("Dueño", "Owner"))}, ${b.founded}, 0, null, ${arr(b.languages)}, '[]'::jsonb)`])).join(",\n")};`);
  P(`insert into business_members (business_id, user_id, kind, display_name, role, bio, languages, specialties, status, show_on_page, panel_access, since_year, sort, same_as_business_hours)
select t.b, case when t.k = 0 then bz.owner_user_id end, case when t.k = 0 then 'owner' else 'staff' end, t.nm, t.role, t.bio, t.langs, t.spec, 'active', true, case when t.k = 0 then '{all}'::text[] else '{}'::text[] end, t.since, t.k, true
  from _t t join businesses bz on bz.id = t.b
 where not exists (select 1 from business_members m where m.business_id = t.b and m.display_name = t.nm);`);
  P(`create temp table _l (b text, kind text, title jsonb, num text, k int, review date) on commit drop;`);
  const lic = negocios.flatMap((b) => b.licenses.map((l, k) => `(${s(b.id)}, ${s(l.kind)}, ${j(l.title)}, ${s(l.num)}, ${k}, ${dateLit(l.review)})`));
  if (lic.length) {
    P(`insert into _l values\n${lic.join(",\n")};`);
    P(`insert into licenses (business_id, kind, title, number, status, city_id, source, sort, verified_at, next_review, checked_at)
select l.b, l.kind, l.title, l.num, 'valid', bz.city_id, 'semilla', l.k, now(), l.review, now() from _l l join businesses bz on bz.id = l.b
 where not exists (select 1 from licenses x where x.business_id = l.b and x.kind = l.kind and x.status = 'valid');`);
  }
  /* lo que vende, calendario y ajustes propios de la categoría */
  for (const x of extra) P(x);
  /* novedades */
  P(`create temp table _n (b text, kind text, title text, body text, at timestamp, ends timestamp, was int, now_ int, item text, poll text[], pin boolean) on commit drop;`);
  P(`insert into _n values\n${negocios.flatMap((b) => b.posts.map((p) => `(${s(b.id)}, ${s(p.kind)}, ${s(p.title)}, ${s(p.body)}, ${ts(p.at)}, ${p.ends ? ts(p.ends) : "null"}, ${n(p.was)}, ${n(p.now)}, ${s(p.item)}, ${p.poll ? arr(p.poll) : "null"}, ${!!p.pin})`)).join(",\n")};`);
  P(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, poll, publish_at, ends_at, pinned, created_by, created_at)
select n.b, bz.city_id, n.kind, n.title, n.body, case when n.item is not null then 'item' else 'none' end,
       (select i.id from items i where i.business_id = n.b and i.name->>'es' = n.item and i.removed_at is null limit 1), n.was, n.now_, n.poll, n.at at time zone '${TZ}', n.ends at time zone '${TZ}', n.pin, bz.owner_user_id, n.at at time zone '${TZ}'
  from _n n join businesses bz on bz.id = n.b
 where not exists (select 1 from business_posts p where p.business_id = n.b and p.title = n.title);`);
  /* seguidores */
  P(`create temp table _f (b text, ph text, d timestamp) on commit drop;`);
  const fol = negocios.flatMap((b) => b.follows.map((f) => `(${s(b.id)}, ${s(f.phone)}, ${ts(f.at)})`));
  P(`insert into _f values\n${fol.join(",\n")};`);
  P(`insert into follows (follower_user_id, target_kind, target_id, created_at) select u.id, 'business', f.b, f.d at time zone '${TZ}' from _f f join users u on u.phone = f.ph on conflict do nothing;`);
  /* operaciones */
  P(`create temp table _o (b text, ck text, num text, kind text, ph text, st text, sent timestamp, sched timestamp, ans timestamp, conf timestamp, done timestamp, canc timestamp, cby text, creason text, resp timestamp, sd text, dur int, ps int, det jsonb, note text, sub int, tot int, dep int, pm text, item text, qty int, unit int, lname jsonb, paykind text, payamt int, payfee int, paystat text, pstat text) on commit drop;`);
  const orows = ops.map((o) => `(${s(o.b)}, ${s(o.ck)}, ${s(o.num)}, ${s(o.kind)}, ${s(o.ph)}, ${s(o.st)}, ${ts(o.sent)}, ${ts(o.sched)}, ${ts(o.ans)}, ${ts(o.conf)}, ${ts(o.done)}, ${ts(o.canc)}, ${s(o.cby)}, ${s(o.creason)}, ${ts(o.resp)}, ${s(o.sd)}, ${n(o.dur)}, ${n(o.ps)}, ${j(o.det)}, ${s(o.note)}, ${n(o.sub)}, ${n(o.tot)}, ${n(o.dep)}, ${s(o.pm)}, ${s(o.item)}, ${n(o.qty)}, ${n(o.unit)}, ${j(o.lname)}, ${s(o.payKind)}, ${n(o.payAmt)}, ${n(o.payFee)}, ${s(o.payStat)}, ${s(o.pstat)})`);
  for (let k = 0; k < orows.length; k += 400) P(`insert into _o values\n${orows.slice(k, k + 400).join(",\n")};`);
  P(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, respond_by, status_detail, duration_min, party_size, details, customer_note, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status, client_key, is_test, updated_at)
select o.num, o.kind, bz.city_id, o.b, u.id, o.st, o.sched at time zone '${TZ}', o.sent at time zone '${TZ}', o.ans at time zone '${TZ}', o.conf at time zone '${TZ}', o.done at time zone '${TZ}', o.canc at time zone '${TZ}', o.cby, o.creason,
       o.resp at time zone '${TZ}', o.sd, o.dur, o.ps, o.det, o.note, o.sub, o.tot, o.dep, o.pm, o.pstat, o.ck::uuid, false, coalesce(o.done, o.canc, o.conf, o.ans, o.sent) at time zone '${TZ}'
  from _o o join users u on u.phone = o.ph join businesses bz on bz.id = o.b
on conflict do nothing;`);
  P(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
select op.id, (select i.id from items i where i.business_id = o.b and i.name->>'es' = o.item and i.removed_at is null order by i.module limit 1), o.lname, o.qty, o.unit, o.tot, 0, '[]'::jsonb
  from _o o join users u on u.phone = o.ph join operations op on op.user_id = u.id and op.client_key = o.ck::uuid
 where not exists (select 1 from operation_lines l where l.operation_id = op.id);`);
  P(`create temp table _e (ck text, ph text, k text, a text, t timestamp) on commit drop;`);
  const erows = ops.flatMap((o) => o.ev.map((e) => `(${s(o.ck)}, ${s(o.ph)}, ${s(e[0])}, ${s(e[1])}, ${ts(e[2])})`));
  for (let k = 0; k < erows.length; k += 800) P(`insert into _e values\n${erows.slice(k, k + 800).join(",\n")};`);
  P(`insert into operation_events (operation_id, kind, actor, actor_id, at)
select op.id, e.k, e.a, case when e.a = 'user' then u.id::text end, e.t at time zone '${TZ}'
  from _e e join users u on u.phone = e.ph join operations op on op.user_id = u.id and op.client_key = e.ck::uuid
 where not exists (select 1 from operation_events x where x.operation_id = op.id);`);
  P(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, refunded_cents, status, card_brand, card_last4, held_at, captured_at, released_at, simulated, created_at, updated_at)
select op.id, op.user_id, o.b, op.city_id, o.paykind, 'card', 'pi_sim_' || substr(o.ck, 1, 20), o.payamt, o.payfee, case when o.paystat = 'refunded' then o.payamt else 0 end, o.paystat, 'visa', lpad((abs(hashtext(o.ck)) % 10000)::text, 4, '0'),
       o.sent at time zone '${TZ}', case when o.paystat in ('captured', 'refunded') then coalesce(o.conf, o.sent) at time zone '${TZ}' end, case when o.paystat in ('released', 'refunded') then coalesce(o.canc, o.ans, o.resp, o.done) at time zone '${TZ}' end, true, o.sent at time zone '${TZ}', coalesce(o.done, o.canc, o.conf, o.sent) at time zone '${TZ}'
  from _o o join users u on u.phone = o.ph join operations op on op.user_id = u.id and op.client_key = o.ck::uuid
 where o.payamt is not null and not exists (select 1 from payments p where p.operation_id = op.id);`);
  /* reseñas (de operaciones terminadas) */
  P(`create temp table _r (ck text, ph text, stars int, body text, lang text, ans jsonb, rec text, reply text, rlang text, d int, rd int) on commit drop;`);
  const rrows = ops.filter((o) => o.review).map((o) => { const v = o.review; return `(${s(o.ck)}, ${s(o.ph)}, ${v.stars}, ${s(v.body)}, ${s(v.lang)}, ${j(v.ans)}, ${s(v.rec)}, ${s(v.reply)}, ${s(v.rlang)}, ${v.d}, ${v.rd})`; });
  for (let k = 0; k < rrows.length; k += 500) P(`insert into _r values\n${rrows.slice(k, k + 500).join(",\n")};`);
  P(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, rec, reply, reply_at, reply_by, reply_lang, created_at)
select op.business_id, op.city_id, op.user_id, op.id, 'cita', r.stars, r.body, r.lang, r.ans,
       coalesce((select array_agg(i.id::text) from items i where i.business_id = op.business_id and i.name->>'es' = r.rec and i.removed_at is null), '{}'::text[]),
       r.reply, case when r.reply is not null then (coalesce(op.done_at, op.scheduled_at) + interval '1 day' * (r.d + r.rd)) end, case when r.reply is not null then bz.owner_user_id end, r.rlang,
       coalesce(op.done_at, op.scheduled_at) + interval '1 day' * r.d
  from _r r join users u on u.phone = r.ph join operations op on op.user_id = u.id and op.client_key = r.ck::uuid join businesses bz on bz.id = op.business_id
on conflict do nothing;`);
  for (const x of after) P(x);
  P(`do $$ declare x text; begin for x in select id from businesses where id in (${negocios.map((b) => s(b.id)).join(",")}) loop perform reviews_stats(x); perform licencias_refrescar(x); end loop; end $$;`);
  P(`update business_stats_cache c set profile_strength = perfil_fuerza(c.business_id) where c.business_id in (${negocios.map((b) => s(b.id)).join(",")});`);
  P("commit;");
  return out.join("\n") + "\n";
}
